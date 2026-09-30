import React from 'react';
import BackingTrackPage from '../pages/playerPage/BackingTrackPage';
import ChordsPage from '../pages/chordsPage/ChordsPage';
import { Route } from 'react-router-dom';
import MainPage from '../pages/MainPage';
import ChordTest from '../pages/ChordTest';
import FlatboardPage from '../pages/flatboardPage/FlatboardPage';
import AiForm from '../pages/chordsPage/AiForm';
import ChromaticPage from '../pages/chromaticPage/ChromaticPage';
import ChordEditor from '../pages/ChordEditor';
import ChordGeneratorTest from '../pages/ChordGeneratorTest';
import { ChordGridPage } from '../pages/exerciseChord';
import RhythmPage from '../pages/rhythmPage/RhythmPage';
import { RhythmEvent } from '../pages/rhythmPage/types';
import SongListPage from '../pages/songSketchPage/SongListPage';
import SongEditorPage from '../pages/songSketchPage/SongEditorPage';

export interface RouteItem {
  path: string;
  element: React.ReactElement;
  exact?: boolean;
  needLogin?: boolean;
  children?: RouteItem[];
}

export function renderRoute(route: RouteItem, index: number) {
  return (
    <Route key={index} path={route.path} element={route.element}>
      {route.children?.map(renderRoute)}
    </Route>
  );
}

const routes: RouteItem[] = [
  {
    path: '/',
    element: <MainPage />,
    exact: true,
  },
  {
    path: '/chords',
    element: <ChordsPage />,
    exact: true,
  },
  {
    path: '/backingTracks',
    element: <BackingTrackPage />,
    exact: true,
  },
  {
    path: '/test',
    element: <ChordTest />,
    exact: true,
  },
  {
    path: '/fretboard',
    element: <FlatboardPage />,
    exact: true,
  },
  {
    path: '/aiForm',
    element: <AiForm />,
    exact: true,
  },
  {
    path: '/chromatic',
    element: <ChromaticPage />,
    exact: true,
  },
  {
    path: '/editor',
    element: <ChordEditor />,
    exact: true,
  },
  {
    path: '/generator-test',
    element: <ChordGeneratorTest />,
    exact: true,
  },
  {
    path: '/exercise-chords',
    element: <ChordGridPage />,
  },
  {
    path: '/rhythm',
    element: <RhythmPage />,
    exact: true,
  },
  {
    path: '/songs',
    element: <SongListPage />,
    exact: true,
  },
  {
    path: '/songs/:id',
    element: <SongEditorPage />,
    exact: true,
  },
];

export default routes;
