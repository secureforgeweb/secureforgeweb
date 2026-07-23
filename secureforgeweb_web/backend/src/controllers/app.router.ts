import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { COOKIE_NAME, SESSION_TTL_MS } from "@shared/const";
import { apiError } from "../../shared/apiErrors.js";
import { getSessionCookieOptions } from "../_core/cookies.js";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";
import {
  createLocalUser,
  getUserByEmail,
  upsertUser,
  getAllUsers,
  updateUserRole,
  updateUserInfo,
  deleteUserById,
  resetUserPassword,
  clearMustChangePassword,
  createPasswordResetToken,
  getPasswordResetToken,
  resetPasswordWithToken,
  getNotificationsByUser,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
} from "../models/db.js";
import { sendPasswordResetEmail } from "../services/email.js";
import { HTTP_ASSESSMENT_ITEM_CODES, runHttpHeaderAssessment } from "../services/checklistAssessor.js";
import { GIT_ASSESSMENT_ITEM_CODES, runGitRepositoryAssessment, sanitizeGitRepositoryUrlInput } from "../services/gitRepoAssessor.js";
import {
  AI_ORCHESTRATED_ITEM_CODES,
  runAiAgentAssessment,
} from "../services/aiChecklistAssessor.js";
import {
  AI_PROVIDER_IDS,
  getAiAssistantPublicConfig,
  saveAiAssistantConfig,
  testAiAssistantConnection,
} from "../services/aiAssistantConfig.js";
import crypto from "crypto";
import {
  getRegisterSchema,
  getLoginSchema,
  getApplicationSchema,
  getUpdateApplicationSchema,
  getAnalysisSchema,
  getSaveResponsesSchema,
  getFindingSchema,
  getUpdateFindingSchema,
  getUpdateFindingStatusSchema,
  getListFindingsSchema,
  validateJoi,
  isPasswordValid,
} from "../lib/validation.js";
import { throwApiError } from "../lib/trpcErrors.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { sdk } from "../_core/sdk.js";
import {
  createApplication,
  getApplicationsByUser,
  getAllApplicationsWithOwner,
  getApplicationById,
  updateApplication,
  deleteApplication,
  countApplicationsByUser,
} from "../models/applications.db.js";
import { getChecklistCatalog, listAvailableChecklists, updateChecklistItemById } from "../models/checklist.db.js";
import { syncAsvsCatalog } from "../services/asvsCatalog.js";
import {
  resolveItemDescription,
  resolveItemTitle,
  type ChecklistLocale,
  isChecklistLocale,
} from "../../shared/checklistLocale.js";
import {
  createAnalysis,
  getAnalysisById,
  getAnalysesEnrichedByApplication,
  getAllAnalysesForAdmin,
  getAnalysisWizardState,
  saveAnalysisResponses,
  completeAnalysis,
} from "../models/analyses.db.js";
import {
  createFinding,
  getFindingById,
  getFindingsByApplication,
  getFindingHistory,
  updateFinding,
  updateFindingStatus,
  generateFindingsFromAnalysis,
  countFindingsByApplication,
  priorityFromSeverity,
} from "../models/findings.db.js";
import {
  getApplicationDashboard,
  getGlobalDashboard,
  getPostureReportData,
} from "../models/dashboard.db.js";
import { generatePosturePdfBuffer } from "../services/pdf.js";
import { recordAssessmentRun } from "../models/assessmentRuns.db.js";
import { upsertAnalysisItemEvidence } from "../models/analysisItemEvidence.db.js";

async function assertApplicationAccess(
  applicationId: number,
  userId: number,
  isAdmin: boolean,
  locale: ChecklistLocale
) {
  const app = await getApplicationById(applicationId);
  if (!app || (!isAdmin && app.userId !== userId)) {
    throwApiError("NOT_FOUND", locale, "application.notFound");
  }
  return app;
}

async function assertAnalysisAccess(
  analysisId: number,
  userId: number,
  isAdmin: boolean,
  locale: ChecklistLocale
) {
  const analysis = await getAnalysisById(analysisId);
  if (!analysis) {
    throwApiError("NOT_FOUND", locale, "analysis.notFound");
  }
  await assertApplicationAccess(analysis.applicationId, userId, isAdmin, locale);
  return analysis;
}

async function assertFindingAccess(
  findingId: number,
  userId: number,
  isAdmin: boolean,
  locale: ChecklistLocale
) {
  const finding = await getFindingById(findingId);
  if (!finding || (!isAdmin && finding.userId !== userId)) {
    throwApiError("NOT_FOUND", locale, "finding.notFound");
  }
  return finding;
}

const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  register: publicProcedure
    .input(z.object({ name: z.string(), email: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const validated = validateJoi<{ name: string; email: string; password: string }>(
        getRegisterSchema(ctx.locale),
        input
      );
      const existing = await getUserByEmail(validated.email);
      if (existing) throwApiError("CONFLICT", ctx.locale, "auth.emailTaken");
      const passwordHash = await bcrypt.hash(validated.password, 12);
      const openId = `local_${uuidv4()}`;
      const user = await createLocalUser({
        name: validated.name,
        email: validated.email,
        passwordHash,
        openId,
      });
      return { success: true, userId: user?.id };
    }),

  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const validated = validateJoi<{ email: string; password: string }>(getLoginSchema(ctx.locale), input);
      const user = await getUserByEmail(validated.email);
      const DUMMY_HASH = "$2b$12$invalidhashfortimingneutralizationXXXXXXXXXXXXXXXXXXX";
      const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
      const valid = await bcrypt.compare(validated.password, hashToCompare);
      if (!user || !user.passwordHash || !valid) {
        throwApiError("UNAUTHORIZED", ctx.locale, "auth.invalidCredentials");
      }
      await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      const token = await sdk.createSessionToken(user.openId, {
        name: user.name ?? "",
        expiresInMs: SESSION_TTL_MS,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_TTL_MS });
      return { success: true, mustChangePassword: user.mustChangePassword ?? false };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email(), origin: z.string() }))
    .mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.email) return { success: true, linkInBand: false };
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await createPasswordResetToken(user.id, token, expiresAt);
      const resetUrl = `${input.origin}/reset-password?token=${token}`;
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        userName: user.name ?? "Usuário",
        resetUrl,
        expiresMinutes: 10,
      });
      if (emailResult.linkInBand) {
        // Only expose reset URL in-band when explicitly enabled (local/dev without SMTP).
        const allowInBand = process.env.LINK_IN_BAND_RESET === "1" || process.env.NODE_ENV !== "production";
        if (allowInBand) {
          return {
            success: true,
            linkInBand: true,
            resetUrl,
            deliveryNote: emailResult.deliveryNote,
          };
        }
        console.warn("[Auth] Password reset email unavailable; LINK_IN_BAND_RESET not enabled in production.");
      }
      return { success: true, linkInBand: false };
    }),

  validateResetToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input, ctx }) => {
      const record = await getPasswordResetToken(input.token);
      if (!record) return { valid: false, reason: apiError("auth.tokenInvalid", ctx.locale) };
      if (record.usedAt) return { valid: false, reason: apiError("auth.tokenUsed", ctx.locale) };
      if (new Date() > record.expiresAt) return { valid: false, reason: apiError("auth.tokenExpired", ctx.locale) };
      return { valid: true };
    }),

  confirmPasswordReset: publicProcedure
    .input(z.object({ token: z.string(), newPassword: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!isPasswordValid(input.newPassword)) {
        throwApiError("BAD_REQUEST", ctx.locale, "auth.passwordRequirements");
      }
      const record = await getPasswordResetToken(input.token);
      if (!record) throwApiError("BAD_REQUEST", ctx.locale, "auth.tokenInvalid");
      if (record.usedAt) throwApiError("BAD_REQUEST", ctx.locale, "auth.tokenUsed");
      if (new Date() > record.expiresAt) {
        throwApiError("BAD_REQUEST", ctx.locale, "auth.tokenExpired");
      }
      const hash = await bcrypt.hash(input.newPassword, 12);
      await resetPasswordWithToken(record.userId, hash, record.id);
      return { success: true };
    }),

  clearMustChangePassword: protectedProcedure.mutation(async ({ ctx }) => {
    await clearMustChangePassword(ctx.user.id);
    return { success: true };
  }),

  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!isPasswordValid(input.newPassword)) {
        throwApiError("BAD_REQUEST", ctx.locale, "auth.newPasswordRequirements");
      }
      const user = await getUserByEmail(ctx.user.email ?? "");
      if (!user || !user.passwordHash) {
        throwApiError("BAD_REQUEST", ctx.locale, "auth.noLocalPassword");
      }
      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) throwApiError("UNAUTHORIZED", ctx.locale, "auth.wrongCurrentPassword");
      const hash = await bcrypt.hash(input.newPassword, 12);
      await resetUserPassword(ctx.user.id, hash);
      await clearMustChangePassword(ctx.user.id);
      return { success: true };
    }),
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throwApiError("FORBIDDEN", ctx.locale, "auth.adminOnly");
  }
  return next({ ctx });
});

const adminRouter = router({
  listUsers: adminProcedure.query(async () => getAllUsers()),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "security-analyst", "admin"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throwApiError("BAD_REQUEST", ctx.locale, "admin.cannotChangeOwnRole");
      }
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throwApiError("BAD_REQUEST", ctx.locale, "admin.useProfileToEditSelf");
      }
      await updateUserInfo(input.userId, { name: input.name, email: input.email });
      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throwApiError("BAD_REQUEST", ctx.locale, "admin.cannotDeleteSelf");
      }
      await deleteUserById(input.userId);
      return { success: true };
    }),

  resetUserPassword: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throwApiError("BAD_REQUEST", ctx.locale, "admin.useProfileToChangePassword");
      }
      // Temporary password: random + fixed complexity markers (upper/lower/digit/special).
      const temporaryPassword = `Tmp!${crypto.randomBytes(9).toString("base64url")}9a`;
      const hash = await bcrypt.hash(temporaryPassword, 12);
      await resetUserPassword(input.userId, hash);
      return { success: true, temporaryPassword };
    }),

  listChecklistItems: adminProcedure
    .input(z.object({ checklistId: z.number().optional() }).optional())
    .query(async ({ input }) => getChecklistCatalog(input?.checklistId)),

  listChecklists: adminProcedure.query(async () => listAvailableChecklists()),

  syncAsvsCatalog: adminProcedure
    .input(z.object({ force: z.boolean().optional() }).optional())
    .mutation(async ({ input }) => syncAsvsCatalog({ force: input?.force })),

  listAnalyses: adminProcedure
    .input(
      z
        .object({
          applicationId: z.number().optional(),
          baseUrl: z.string().max(500).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => getAllAnalysesForAdmin(input ?? undefined)),

  updateChecklistItem: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(3).max(255).optional(),
        description: z.string().min(10).max(5000).optional(),
        titlePt: z.string().min(3).max(255).optional(),
        descriptionPt: z.string().min(10).max(5000).optional(),
        suggestedSeverity: z.enum(["critical", "high", "medium", "low"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      if (Object.keys(data).length === 0) {
        throwApiError("BAD_REQUEST", ctx.locale, "admin.nothingToUpdate");
      }
      const updated = await updateChecklistItemById(id, data);
      if (!updated) {
        throwApiError("NOT_FOUND", ctx.locale, "checklistItem.notFound");
      }
      return updated;
    }),

});

const aiAssistantRouter = router({
  getConfig: protectedProcedure.query(async ({ ctx }) =>
    getAiAssistantPublicConfig(ctx.user.id)
  ),

  updateConfig: protectedProcedure
    .input(
      z.object({
        provider: z.enum(AI_PROVIDER_IDS),
        apiKey: z.string().max(500).optional(),
        model: z.string().min(1).max(120),
        baseUrl: z.string().max(500),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await saveAiAssistantConfig({
          ...input,
          userId: ctx.user.id,
          locale: ctx.locale,
        });
      } catch (err) {
        if (err instanceof Error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),

  testConnection: protectedProcedure
    .input(
      z.object({
        provider: z.enum(AI_PROVIDER_IDS).optional(),
        apiKey: z.string().max(500).optional(),
        model: z.string().max(120).optional(),
        baseUrl: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await testAiAssistantConnection({
          userId: ctx.user.id,
          locale: ctx.locale,
          ...input,
        });
      } catch (err) {
        if (err instanceof Error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),
});

const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => getNotificationsByUser(ctx.user.id)),
  unreadCount: protectedProcedure.query(async ({ ctx }) => countUnreadNotifications(ctx.user.id)),
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});

const applicationsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        baseUrl: z.string().optional().nullable(),
        repositoryUrl: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        techStack: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const validated = validateJoi<{
          name: string;
          baseUrl?: string | null;
          repositoryUrl?: string | null;
          description?: string | null;
          techStack?: string | null;
        }>(getApplicationSchema(ctx.locale), input);
        return createApplication({
          userId: ctx.user.id,
          name: validated.name,
          baseUrl: validated.baseUrl || null,
          repositoryUrl: validated.repositoryUrl
            ? sanitizeGitRepositoryUrlInput(validated.repositoryUrl)
            : null,
          description: validated.description || null,
          techStack: validated.techStack || null,
        });
      } catch (err) {
        if (err instanceof Error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") {
      return getAllApplicationsWithOwner();
    }
    return getApplicationsByUser(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return assertApplicationAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        baseUrl: z.string().optional().nullable(),
        repositoryUrl: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        techStack: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertApplicationAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      const { id, ...rest } = input;
      const validated = validateJoi<{
        name?: string;
        baseUrl?: string | null;
        repositoryUrl?: string | null;
        description?: string | null;
        techStack?: string | null;
      }>(getUpdateApplicationSchema(ctx.locale), rest);
      const updated = await updateApplication(id, ctx.user.id, {
        name: validated.name,
        baseUrl: validated.baseUrl ?? undefined,
        repositoryUrl:
          validated.repositoryUrl != null && validated.repositoryUrl !== ""
            ? sanitizeGitRepositoryUrlInput(validated.repositoryUrl)
            : validated.repositoryUrl ?? undefined,
        description: validated.description ?? undefined,
        techStack: validated.techStack ?? undefined,
      });
      if (!updated) {
        throwApiError("NOT_FOUND", ctx.locale, "application.notFound");
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertApplicationAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      const ok = await deleteApplication(input.id, ctx.user.id);
      if (!ok) throwApiError("NOT_FOUND", ctx.locale, "application.notFound");
      return { success: true };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const total = await countApplicationsByUser(ctx.user.id);
    return { total };
  }),
});

const checklistRouter = router({
  listAvailable: protectedProcedure.query(async () => listAvailableChecklists()),

  catalog: protectedProcedure
    .input(z.object({ checklistId: z.number().optional() }).optional())
    .query(async ({ input }) => getChecklistCatalog(input?.checklistId)),
});

const analysesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        title: z.string().optional(),
        checklistId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const validated = validateJoi<{
        applicationId: number;
        title?: string;
        checklistId?: number;
      }>(getAnalysisSchema(ctx.locale), input);
      await assertApplicationAccess(
        validated.applicationId,
        ctx.user.id,
        ctx.user.role === "admin",
        ctx.locale
      );
      return createAnalysis({
        applicationId: validated.applicationId,
        userId: ctx.user.id,
        title: validated.title,
        checklistId: validated.checklistId,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return assertAnalysisAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
    }),

  listByApplication: protectedProcedure
    .input(z.object({ applicationId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertApplicationAccess(
        input.applicationId,
        ctx.user.id,
        ctx.user.role === "admin",
        ctx.locale
      );
      return getAnalysesEnrichedByApplication(input.applicationId);
    }),

  getWizard: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertAnalysisAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      const state = await getAnalysisWizardState(input.id);
      if (!state) {
        throwApiError("NOT_FOUND", ctx.locale, "analysis.notFound");
      }
      return state;
    }),

  runAutoAssessment: protectedProcedure
    .input(
      z.object({
        analysisId: z.number(),
        scope: z.enum(["http_headers", "git_repo", "ai_agent"]).default("http_headers"),
        itemIds: z.array(z.number()).optional(),
        locale: z.enum(["en", "pt"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const checklistLocale: ChecklistLocale =
        input.locale && isChecklistLocale(input.locale) ? input.locale : ctx.locale;
      const analysis = await assertAnalysisAccess(input.analysisId, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      if (analysis.status === "concluida") {
        throwApiError("BAD_REQUEST", ctx.locale, "analysis.alreadyCompleted");
      }

      const application = await getApplicationById(analysis.applicationId);
      if (!application) {
        throwApiError("NOT_FOUND", ctx.locale, "application.notFound");
      }

      const state = await getAnalysisWizardState(input.analysisId);
      if (!state) {
        throwApiError("NOT_FOUND", ctx.locale, "analysis.notFound");
      }

      const itemIdFilter = input.itemIds?.length ? new Set(input.itemIds) : null;
      const targetItems = itemIdFilter
        ? state.items.filter((item) => itemIdFilter.has(item.id))
        : state.items;

      if (itemIdFilter && targetItems.length === 0) {
        throwApiError("BAD_REQUEST", ctx.locale, "assessment.noValidItems");
      }

      const itemInputs = targetItems.map((item) => ({
        id: item.id,
        code: item.essentialCode ?? item.code,
      }));

      try {
        if (input.scope === "http_headers") {
          if (!application.baseUrl?.trim()) {
            throwApiError("BAD_REQUEST", ctx.locale, "assessment.missingBaseUrl");
          }

          const { snapshot, suggestions } = await runHttpHeaderAssessment(application.baseUrl, itemInputs);

          await recordAssessmentRun({
            analysisId: input.analysisId,
            userId: ctx.user.id,
            scope: "http_headers",
            assessmentMode: "auto",
            provider: "http-headers",
            itemsAssessed: suggestions.length,
          });

          await upsertAnalysisItemEvidence(input.analysisId, "http_headers", suggestions);

          return {
            scope: input.scope,
            assessedUrl: snapshot.finalUrl,
            requestedUrl: snapshot.requestedUrl,
            statusCode: snapshot.statusCode,
            assessedAt: new Date().toISOString(),
            supportedItemCodes: [...HTTP_ASSESSMENT_ITEM_CODES],
            suggestions,
          };
        }

        if (input.scope === "git_repo") {
          if (!application.repositoryUrl?.trim()) {
            throwApiError("BAD_REQUEST", ctx.locale, "assessment.missingRepoUrl");
          }

          const { snapshot, suggestions } = await runGitRepositoryAssessment(
            application.repositoryUrl,
            itemInputs
          );

          await recordAssessmentRun({
            analysisId: input.analysisId,
            userId: ctx.user.id,
            scope: "git_repo",
            assessmentMode: "auto",
            provider: "git-repo",
            itemsAssessed: suggestions.length,
            contextSummary: `${snapshot.filesScanned} arquivo(s)`,
          });

          await upsertAnalysisItemEvidence(input.analysisId, "git_repo", suggestions);

          return {
            scope: input.scope,
            repositoryUrl: snapshot.repositoryUrl,
            cloneUrl: snapshot.cloneUrl,
            filesScanned: snapshot.filesScanned,
            assessedAt: new Date().toISOString(),
            supportedItemCodes: [...GIT_ASSESSMENT_ITEM_CODES],
            suggestions,
          };
        }

        if (input.scope === "ai_agent") {
          if (!application.baseUrl?.trim() && !application.repositoryUrl?.trim()) {
            throwApiError("BAD_REQUEST", ctx.locale, "assessment.missingUrlsForAi");
          }

          const aiItemInputs = targetItems.map((item) => ({
            id: item.id,
            code: item.code,
            essentialCode: item.essentialCode ?? null,
            asvsId: item.asvsId ?? null,
            verificationLevel: item.verificationLevel ?? null,
            sectionName: item.sectionName ?? null,
            title: resolveItemTitle(item, checklistLocale),
            description: resolveItemDescription(item, checklistLocale),
          }));

          const { context, result: aiResult } = await runAiAgentAssessment({
            userId: ctx.user.id,
            name: application.name,
            baseUrl: application.baseUrl,
            repositoryUrl: application.repositoryUrl,
            techStack: application.techStack,
            description: application.description,
            items: aiItemInputs,
          });

          await recordAssessmentRun({
            analysisId: input.analysisId,
            userId: ctx.user.id,
            scope: "ai_agent",
            assessmentMode: aiResult.mode,
            provider: aiResult.provider,
            itemsAssessed: aiResult.suggestions.length,
            contextSummary: aiResult.contextSummary,
          });

          await upsertAnalysisItemEvidence(input.analysisId, "ai_agent", aiResult.suggestions);

          return {
            scope: input.scope,
            assessmentMode: aiResult.mode,
            provider: aiResult.provider,
            contextSummary: aiResult.contextSummary,
            httpAssessed: Boolean(context.httpSnapshot),
            repositoryAssessed: Boolean(context.gitSnapshot),
            filesScanned: context.gitSnapshot?.filesScanned ?? 0,
            npmAudit: context.npmAuditSummary,
            assessedAt: new Date().toISOString(),
            supportedItemCodes: [...AI_ORCHESTRATED_ITEM_CODES],
            suggestions: aiResult.suggestions,
          };
        }

        throwApiError("BAD_REQUEST", ctx.locale, "assessment.unsupportedScope");
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : apiError("assessment.autoFailed", ctx.locale),
        });
      }
    }),

  saveResponses: protectedProcedure
    .input(
      z.object({
        analysisId: z.number(),
        responses: z.array(
          z.object({
            itemId: z.number(),
            compliance: z.enum(["conforme", "parcial", "nao_conforme", "nao_aplicavel"]),
            notes: z.string().optional().nullable(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertAnalysisAccess(input.analysisId, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      try {
        const validated = validateJoi<{
          responses: Array<{
            itemId: number;
            compliance: "conforme" | "parcial" | "nao_conforme" | "nao_aplicavel";
            notes?: string | null;
          }>;
        }>(getSaveResponsesSchema(ctx.locale), { responses: input.responses });

        const result = await saveAnalysisResponses(input.analysisId, validated.responses);
        if (!result) {
          throwApiError("NOT_FOUND", ctx.locale, "analysis.notFound");
        }
        return result;
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("__invalid_checklist_item__:")) {
          const itemId = err.message.split(":")[1] ?? "";
          throwApiError("BAD_REQUEST", ctx.locale, "analysis.invalidChecklistItem", { itemId });
        }
        if (err instanceof Error && err.message.startsWith("Item de checklist inválido")) {
          throwApiError("BAD_REQUEST", ctx.locale, "analysis.invalidChecklistItem", {
            itemId: err.message.split(": ")[1] ?? "",
          });
        }
        throw err;
      }
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await assertAnalysisAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      const state = await getAnalysisWizardState(input.id);
      if (!state) {
        throwApiError("NOT_FOUND", ctx.locale, "analysis.notFound");
      }
      if (state.progress.answeredItems < state.progress.totalItems) {
        throwApiError("BAD_REQUEST", ctx.locale, "analysis.completeAllItems", {
          answered: state.progress.answeredItems,
          total: state.progress.totalItems,
        });
      }
      if (analysis.status === "concluida") {
        return { success: true, alreadyCompleted: true };
      }
      await completeAnalysis(input.id, ctx.user.id);
      return { success: true, alreadyCompleted: false };
    }),

  dashboard: protectedProcedure
    .input(z.object({ applicationId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertApplicationAccess(input.applicationId, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      const data = await getApplicationDashboard(input.applicationId);
      if (!data) {
        throwApiError("NOT_FOUND", ctx.locale, "application.notFound");
      }
      return data;
    }),

  globalDashboard: protectedProcedure.query(async ({ ctx }) => {
    return getGlobalDashboard(ctx.user.id);
  }),
});

const findingsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        analysisId: z.number(),
        itemId: z.number().optional().nullable(),
        title: z.string(),
        description: z.string().optional().nullable(),
        severity: z.enum(["critical", "high", "medium", "low"]).optional(),
        priority: z.enum(["imediata", "curto_prazo", "medio_prazo", "baixa"]).optional(),
        evidence: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const analysis = await assertAnalysisAccess(input.analysisId, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      try {
        const validated = validateJoi<{
          analysisId: number;
          itemId?: number | null;
          title: string;
          description?: string | null;
          severity?: "critical" | "high" | "medium" | "low";
          priority?: "imediata" | "curto_prazo" | "medio_prazo" | "baixa";
          evidence?: string | null;
        }>(getFindingSchema(ctx.locale), input);

        const severity = validated.severity ?? "medium";
        return createFinding(
          {
            analysisId: validated.analysisId,
            itemId: validated.itemId ?? null,
            userId: analysis.userId,
            title: validated.title,
            description: validated.description || null,
            severity,
            priority: validated.priority ?? priorityFromSeverity(severity),
            evidence: validated.evidence || null,
          },
          ctx.user.id
        );
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        if (err instanceof Error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),

  generateFromAnalysis: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertAnalysisAccess(input.analysisId, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      return generateFindingsFromAnalysis(input.analysisId, ctx.user.id);
    }),

  listByApplication: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        severity: z.enum(["critical", "high", "medium", "low"]).optional(),
        status: z.enum(["aberto", "em_correcao", "resolvido", "aceito_risco"]).optional(),
        categoryId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertApplicationAccess(input.applicationId, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      validateJoi(getListFindingsSchema(ctx.locale), input);
      const rows = await getFindingsByApplication(input.applicationId, {
        severity: input.severity,
        status: input.status,
        categoryId: input.categoryId,
      });
      if (ctx.user.role !== "admin") {
        return rows.filter((r) => r.userId === ctx.user.id);
      }
      return rows;
    }),

  stats: protectedProcedure
    .input(z.object({ applicationId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertApplicationAccess(input.applicationId, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      const total = await countFindingsByApplication(input.applicationId);
      return { total };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return assertFindingAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
    }),

  getHistory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertFindingAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      return getFindingHistory(input.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional().nullable(),
        severity: z.enum(["critical", "high", "medium", "low"]).optional(),
        evidence: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertFindingAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      const { id, ...rest } = input;
      const validated = validateJoi<{
        title?: string;
        description?: string | null;
        severity?: "critical" | "high" | "medium" | "low";
        evidence?: string | null;
        notes?: string | null;
      }>(getUpdateFindingSchema(ctx.locale), rest);
      const updated = await updateFinding(id, ctx.user.id, validated);
      if (!updated) {
        throwApiError("NOT_FOUND", ctx.locale, "finding.notFound");
      }
      return updated;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["aberto", "em_correcao", "resolvido", "aceito_risco"]),
        comment: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertFindingAccess(input.id, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      const validated = validateJoi<{ status: "aberto" | "em_correcao" | "resolvido" | "aceito_risco"; comment?: string | null }>(
        getUpdateFindingStatusSchema(ctx.locale),
        { status: input.status, comment: input.comment }
      );
      const updated = await updateFindingStatus(
        input.id,
        ctx.user.id,
        validated.status,
        validated.comment
      );
      if (!updated) {
        throwApiError("NOT_FOUND", ctx.locale, "finding.notFound");
      }
      return updated;
    }),
});

const reportsRouter = router({
  exportPdf: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        analysisId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertApplicationAccess(input.applicationId, ctx.user.id, ctx.user.role === "admin", ctx.locale);
      const report = await getPostureReportData(input.applicationId, input.analysisId);
      if (!report) {
        throwApiError("NOT_FOUND", ctx.locale, "application.notFound");
      }

      const { dashboard, findings, analysisTitle, analysisCompletedAt } = report;
      const buffer = await generatePosturePdfBuffer({
        applicationName: dashboard.application.name,
        applicationUrl: dashboard.application.baseUrl,
        techStack: dashboard.application.techStack,
        userName: ctx.user.name ?? "Usuário",
        userEmail: ctx.user.email ?? "",
        analysisTitle,
        analysisCompletedAt,
        postureScore: dashboard.postureScore,
        totalFindings: dashboard.totalFindings,
        openFindings: dashboard.openFindings,
        resolutionRate: dashboard.resolutionRate,
        findingsBySeverity: dashboard.findingsBySeverity,
        findings,
      });

      const slug = dashboard.application.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const date = new Date().toISOString().slice(0, 10);

      return {
        base64: buffer.toString("base64"),
        mimeType: "application/pdf" as const,
        filename: `postura-${slug}-${date}.pdf`,
        findingCount: findings.length,
        postureScore: dashboard.postureScore,
      };
    }),
});

export { authRouter, adminRouter, aiAssistantRouter, notificationsRouter, applicationsRouter, checklistRouter, analysesRouter, findingsRouter, reportsRouter };
