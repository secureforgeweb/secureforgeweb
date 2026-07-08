/**
 * Must be the first import of the server entry so process.env is populated
 * before any module reads ENV (ESM hoists static imports).
 */
import { loadProjectEnv } from "../../shared/loadProjectEnv.js";

loadProjectEnv(import.meta.url);
