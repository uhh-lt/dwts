import { createBrowserRouter } from "react-router-dom";
import RequireAuth from "../auth/RequireAuth.tsx";
import NoBarLayout from "../layouts/NoBarLayout.tsx";
import OneBarLayout from "../layouts/OneBarLayout.tsx";
import TwoBarLayout from "../layouts/TwoBarLayout.tsx";
import About from "../views/About.tsx";
import Imprint from "../views/Imprint.tsx";
import Login from "../views/Login.tsx";
import NotFound from "../views/NotFound.tsx";
import Analysis from "../views/analysis/Analysis.tsx";
import AnnotatedSegments from "../views/analysis/AnnotatedSegments/AnnotatedSegments.tsx";
import CodeFrequencyAnalysis from "../views/analysis/CodeFrequency/CodeFrequencyAnalysis.tsx";
import CodeGraph from "../views/analysis/CodeGraph/CodeGraph.tsx";
import CotaDashboard from "../views/analysis/ConceptsOverTime/CotaDashboard.tsx";
import CotaView from "../views/analysis/ConceptsOverTime/CotaView.tsx";
import EntityDashboard from "../views/analysis/EntityDashboard/EntityDashboard.tsx";
import TableDashboard from "../views/analysis/Table/TableDashboard.tsx";
import TableView from "../views/analysis/Table/TableView.tsx";
import TimelineAnalysis from "../views/analysis/TimelineAnalysis/TimelineAnalysis.tsx";
import TimelineAnalysisDashboard from "../views/analysis/TimelineAnalysis/TimelineAnalysisDashboard.tsx";
import WordFrequency from "../views/analysis/WordFrequency/WordFrequency.tsx";
import Annotation from "../views/annotation/Annotation.tsx";
import Feedback from "../views/feedback/Feedback.tsx";
import FeedbackAll from "../views/feedback/FeedbackAll.tsx";
import FeedbackUser from "../views/feedback/FeedbackUser.tsx";
import Logbook from "../views/logbook/Logbook.tsx";
import Profile from "../views/profile/Profile.tsx";
import Projects from "../views/projects/Projects.tsx";
import Register from "../views/registration/Register.tsx";
import Search from "../views/search/DocumentSearch/Search.tsx";
import ImageSimilaritySearch from "../views/search/ImageSearch/ImageSimilaritySearch.tsx";
import SentenceSimilaritySearch from "../views/search/SentenceSearch/SentenceSimilaritySearch.tsx";
import Autologbook from "../views/tools/AutoLogbook/Autologbook.tsx";
import DocumentSampler from "../views/tools/DocumentSampler/DocumentSampler.tsx";
import DuplicateFinder from "../views/tools/DuplicateFinder/DuplicateFinder.tsx";
import Whiteboard from "../views/whiteboard/Whiteboard.tsx";
import WhiteboardDashboard from "../views/whiteboard/WhiteboardDashboard.tsx";

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
        path: "/project/:projectId/sentencesearch",
        element: <SentenceSimilaritySearch />,
      },
      {
        path: "/project/:projectId/imagesearch",
        element: <ImageSimilaritySearch />,
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
        path: "/project/:projectId/analysis/entity-dashboard",
        element: <EntityDashboard />,
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
        path: "/project/:projectId/tools/autologbook",
        element: <Autologbook />,
      },
      {
        path: "/project/:projectId/tools/duplicate-finder",
        element: <DuplicateFinder />,
      },
      {
        path: "/project/:projectId/tools/document-sampler",
        element: <DocumentSampler />,
      },
    ],
  },
]);

export default router;
