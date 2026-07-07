import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/views/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/views/Home";
import Login from "@/views/Login";
import Register from "@/views/Register";
import Dashboard from "@/views/Dashboard";
import Applications from "@/views/Applications";
import NewApplication from "@/views/NewApplication";
import ApplicationDetail from "@/views/ApplicationDetail";
import ApplicationDashboard from "@/views/ApplicationDashboard";
import ApplicationFindings from "@/views/ApplicationFindings";
import FindingDetail from "@/views/FindingDetail";
import AnalysisChecklistWizard from "@/views/AnalysisChecklistWizard";
import Admin from "@/views/Admin";
import AdminUsers from "@/views/AdminUsers";
import AdminChecklistItems from "@/views/AdminChecklistItems";
import AdminAiAssistant from "@/views/AdminAiAssistant";
import AdminAnalyses from "@/views/AdminAnalyses";
import Profile from "@/views/Profile";
import ResetPassword from "@/views/ResetPassword";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/posture" component={Dashboard} />
      <Route path="/applications/new" component={NewApplication} />
      <Route path="/analyses/:id/checklist" component={AnalysisChecklistWizard} />
      <Route path="/applications/:id/dashboard" component={ApplicationDashboard} />
      <Route path="/applications/:id/findings" component={ApplicationFindings} />
      <Route path="/findings/:id" component={FindingDetail} />
      <Route path="/applications/:id" component={ApplicationDetail} />
      <Route path="/applications" component={Applications} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/checklist-items" component={AdminChecklistItems} />
      <Route path="/admin/analyses" component={AdminAnalyses} />
      <Route path="/admin/ai-assistant" component={AdminAiAssistant} />
      <Route path="/profile/ai-assistant" component={AdminAiAssistant} />
      <Route path="/profile" component={Profile} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
