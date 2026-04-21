import React from 'react';
import { Composition, registerRoot, getInputProps } from 'remotion';
import {
  MindMap,
  DEMO_DATA,
  calcTotalFrames,
  calcAppearFrames,
} from './MindMap';
import { TechTheme } from './styles';
import { layoutMindMap } from './layout';
import type { MindMapNode } from './layout';

const inputProps = getInputProps();
const propsData = inputProps && typeof inputProps === 'object' && 'data' in inputProps
  ? (inputProps as { data: MindMapNode }).data
  : null;
const data: MindMapNode = propsData && typeof propsData === 'object' && 'label' in propsData
  ? propsData
  : DEMO_DATA;

const layout = layoutMindMap(data, true);
const appearFrames = calcAppearFrames(layout);
const totalFrames = calcTotalFrames(layout, appearFrames);

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MindMap"
        component={MindMap}
        durationInFrames={totalFrames}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          data,
          theme: TechTheme,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
