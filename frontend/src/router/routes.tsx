import { createBrowserRouter } from "react-router-dom";
import RequireAuth from "../auth/RequireAuth";
import NoBarLayout from "../layouts/NoBarLayout";
import OneBarLayout from "../layouts/OneBarLayout";
import TwoBarLayout from "../layouts/TwoBarLayout";
import About from "../views/About";
import Imprint from "../views/Imprint";
import Login from "../views/Login";
import NotFound from "../views/NotFound";
import Analysis from "../views/analysis/Analysis";
import AnnotatedSegments from "../views/analysis/AnnotatedSegments/AnnotatedSegments";
import CodeFrequencyAnalysis from "../views/analysis/CodeFrequency/CodeFrequencyAnalysis";
import CodeGraph from "../views/analysis/CodeGraph/CodeGraph";
import TableDashboard from "../views/analysis/Table/TableDashboard";
import TableView from "../views/analysis/Table/TableView";
import TimelineAnalysis from "../views/analysis/TimelineAnalysis/TimelineAnalysis";
import Annotation from "../views/annotation/Annotation";
import Autologbook from "../views/autologbook/Autologbook";
import Feedback from "../views/feedback/Feedback";
import FeedbackAll from "../views/feedback/FeedbackAll";
import FeedbackUser from "../views/feedback/FeedbackUser";
import Logbook from "../views/logbook/Logbook";
import Profile from "../views/profile/Profile";
import Projects from "../views/projects/Projects";
import ProjectSettings from "../views/projectsettings/ProjectSettings";
import ProjectCreation from "../views/projectsettings/creation/ProjectCreation";
import ProjectUpdate from "../views/projectsettings/update/ProjectUpdate";
import Register from "../views/registration/Register";
import Search from "../views/search/Search";
import Settings from "../views/settings/Settings";
import Whiteboard from "../views/whiteboard/Whiteboard";
import WhiteboardDashboard from "../views/whiteboard/WhiteboardDashboard";
import WordFrequency from "../views/analysis/WordFrequency/WordFrequency";
import TimelineAnalysisDashboard from "../views/analysis/TimelineAnalysis/TimelineAnalysisDashboard";
import DocumentSampler from "../views/analysis/DocumentSampler/DocumentSampler";
import CotaDashboard from "../views/analysis/ConceptsOverTime/CotaDashboard";
import CotaView from "../views/analysis/ConceptsOverTime/CotaView";

const router = createBrowserRouter([
  {
    path: "/",
    element: <NoBarLayout />,
    children: [
      {
        path: "/",
        element: <Login />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
    ],
  },
  {
    path: "/",
    element: <OneBarLayout />,
    children: [
      {
        path: "/projects",
        element: (
          <RequireAuth>
            <Projects />
          </RequireAuth>
        ),
      },
      {
        path: "/projectsettings",
        element: (
          <RequireAuth>
            <ProjectSettings />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <ProjectCreation /> },
          { path: "/projectsettings/:projectId", element: <ProjectUpdate /> },
        ],
      },
      {
        path: "/settings",
        element: (
          <RequireAuth>
            <Settings />
          </RequireAuth>
        ),
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/imprint",
        element: <Imprint />,
      },
      {
        path: "/me",
        element: (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        ),
      },
      {
        path: "/feedback",
        element: <Feedback />,
        children: [
          {
            path: "/feedback",
            element: <FeedbackAll />,
          },
          {
            path: "/feedback/:userId",
            element: <FeedbackUser />,
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/project/:projectId",
    element: (
      <RequireAuth>
        <TwoBarLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: "/project/:projectId/annotation/",
        element: <Annotation />,
      },
      {
        path: "/project/:projectId/annotation/:sdocId",
        element: <Annotation />,
      },
      {
        path: "/project/:projectId/search",
        element: <Search />,
      },
      {
        path: "/project/:projectId/search/doc/:sdocId",
        element: <Search />,
      },
      {
        path: "/project/:projectId/analysis",
        element: <Analysis />,
      },
      {
        path: "/project/:projectId/analysis/frequency",
        element: <CodeFrequencyAnalysis />,
      },
      {
        path: "/project/:projectId/analysis/code-graph",
        element: <CodeGraph />,
      },
      {
        path: "/project/:projectId/analysis/timeline",
        element: <TimelineAnalysisDashboard />,
      },
      {
        path: "/project/:projectId/analysis/timeline/:analysisId",
        element: <TimelineAnalysis />,
      },
      {
        path: "/project/:projectId/analysis/annotated-segments",
        element: <AnnotatedSegments />,
      },
      {
        path: "/project/:projectId/analysis/word-frequency",
        element: <WordFrequency />,
      },
      {
        path: "/project/:projectId/analysis/table",
        element: <TableDashboard />,
      },
      {
        path: "/project/:projectId/analysis/table/:tableId",
        element: <TableView />,
      },
      {
        path: "/project/:projectId/analysis/document-sampler",
        element: <DocumentSampler />,
      },
      {
        path: "/project/:projectId/analysis/concepts-over-time-analysis",
        element: <CotaDashboard />,
      },
      {
        path: "/project/:projectId/analysis/concepts-over-time-analysis/:cotaId",
        element: <CotaView />,
      },
      {
        path: "/project/:projectId/whiteboard",
        element: <WhiteboardDashboard />,
      },
      {
        path: "/project/:projectId/whiteboard/:whiteboardId",
        element: <Whiteboard />,
      },
      {
        path: "/project/:projectId/logbook",
        element: <Logbook />,
      },
      {
        path: "/project/:projectId/logbook/:category",
        element: <Logbook />,
      },
      {
        path: "/project/:projectId/autologbook",
        element: <Autologbook />,
      },
    ],
  },
]);

export default router;
