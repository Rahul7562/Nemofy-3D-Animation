import { Composition, staticFile } from "remotion";
import { Scene, myCompSchema } from "./Scene";
import { getMediaMetadata } from "./helpers/get-media-metadata";
import { CinematicStoryComposition } from "./compositions/CinematicStoryComposition";
import { DEFAULT_STUDIO_PROJECT } from "./utils/default-project";
import {
  computeSceneTimeline,
  getDimensionsForAspectRatio,
} from "./utils/animation-math";

export const RemotionRoot: React.FC = () => {
  const defaultDims = getDimensionsForAspectRatio(
    DEFAULT_STUDIO_PROJECT.brief.aspectRatio,
  );
  const { totalFrames } = computeSceneTimeline(
    DEFAULT_STUDIO_PROJECT.scenes,
    DEFAULT_STUDIO_PROJECT.brief.fps,
  );

  return (
    <>
      <Composition
        id="CinematicStory"
        component={
          CinematicStoryComposition as unknown as React.ComponentType<
            Record<string, unknown>
          >
        }
        fps={DEFAULT_STUDIO_PROJECT.brief.fps}
        durationInFrames={totalFrames}
        width={defaultDims.width}
        height={defaultDims.height}
        defaultProps={{
          project: DEFAULT_STUDIO_PROJECT,
          activeSceneIdOverride: null,
          showSubtitles: true,
          showHudOverlay: true,
        }}
      />
      <Composition
        id="Scene"
        component={Scene}
        fps={30}
        durationInFrames={300}
        width={1280}
        height={720}
        schema={myCompSchema}
        defaultProps={{
          deviceType: "phone",
          phoneColor: "rgb(110, 152, 191)" as const,
          baseScale: 1,
          mediaMetadata: null,
          videoSrc: null,
        }}
        calculateMetadata={async ({ props }) => {
          const videoSrc =
            props.deviceType === "phone"
              ? staticFile("phone.mp4")
              : staticFile("tablet.mp4");

          const mediaMetadata = await getMediaMetadata(videoSrc);

          return {
            props: {
              ...props,
              mediaMetadata,
              videoSrc,
            },
          };
        }}
      />
    </>
  );
};
