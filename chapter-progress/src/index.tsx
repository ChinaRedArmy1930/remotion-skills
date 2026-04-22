import React from 'react';
import { Composition, registerRoot, getInputProps } from 'remotion';
import { ProgressBar } from './ProgressBar';
import { DefaultTheme } from './styles';
import { calcTimedTree, calcTotalFrames } from './timing';
import type { ChapterNode } from './types';

// Demo 数据
const DEMO_DATA: ChapterNode = {
  label: '前端技术栈',
  children: [
    {
      label: '框架',
      children: [
        { label: 'React' },
        { label: 'Vue' },
        { label: 'Angular' },
      ],
    },
    {
      label: '构建工具',
      children: [
        { label: 'Webpack' },
        { label: 'Vite' },
      ],
    },
    {
      label: '状态管理',
      children: [
        { label: 'Redux' },
        { label: 'MobX' },
      ],
    },
  ],
};

// 读取输入数据
const inputProps = getInputProps() as Record<string, unknown> | null;
const propsData =
  inputProps && typeof inputProps === 'object' && 'data' in inputProps
    ? (inputProps as { data: ChapterNode }).data
    : null;
const data: ChapterNode =
  propsData && typeof propsData === 'object' && 'label' in propsData
    ? propsData
    : DEMO_DATA;

// 读取自定义参数
const fontFamily = (inputProps?.fontFamily as string) || DefaultTheme.fontFamily;
const videoWidth = (inputProps?.width as number) || 1920;
const videoHeight = (inputProps?.height as number) || 1080;

// 构建时间树
const tree = calcTimedTree(data, { chapterGap: 0 });
const totalFrames = calcTotalFrames(tree, 0);

const customTheme = { ...DefaultTheme, fontFamily };

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ChapterProgress"
        component={ProgressBar}
        durationInFrames={totalFrames}
        fps={30}
        width={videoWidth}
        height={videoHeight}
        defaultProps={{
          tree,
          totalFrames,
          theme: customTheme,
          width: videoWidth,
          height: videoHeight,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
