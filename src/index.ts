import React from "react";
import { createSpringAnimation, SpringParameters } from "springframes";

type FromTo = { from: number; to: number };

export type Variant = "visible" | "hidden";

export type Variants = {
  x?: FromTo;
  y?: FromTo;
  scale?: FromTo;
  opacity?: FromTo;
  deg?: number;
};

export type SpringOptions = Pick<
  SpringParameters,
  "damping" | "stiffness" | "mass"
>;

export type Parameters = {
  variants: Variants;
  options?: SpringOptions;
  initial: Variant;
  animateFirstRender?: boolean;
  enter?: (fn?: () => void) => void;
  exit?: (fn?: () => void) => void;
  wait?: (fn?: () => void) => void;
  debugName?: string;
};

const isAnyDefined = (...args) =>
  args.some((arg) => arg !== undefined && arg !== null);

const noop = () => {};

export const useAnimatePresence = ({
  variants,
  initial,
  animateFirstRender = true,
  options = {},
  enter,
  exit,
  wait,
  debugName = "unknown",
}: Parameters) => {
  const [variant, setVariant] = React.useState(initial);
  const didRender = React.useRef(false);
  const animationInstance = React.useRef();
  const domRef = React.useRef();
  const aboutToExit = React.useRef(false);

  const isVisible = variant === "visible";

  const { stiffness = 150, mass = 3, damping = 27 } = options;

  const animateSpring = (el, visible: boolean) => {
    const variantsX = variants.x || { from: 0, to: 0 };
    const variantsY = variants.y || { from: 0, to: 0 };

    const diffX = variantsX.from - variantsX.to;
    const diffY = variantsY.from - variantsY.to;
    const scale = variants.scale ? variants.scale.to - variants.scale.from : 1;

    const { keyframes, frames } = createSpringAnimation({
      dx: diffX,
      dy: diffY,
      stiffness,
      mass,
      damping,
      scale,
      deg: variants.deg,
      reverse: !visible,
    });

    if (variants.opacity) {
      const { from, to } = variants.opacity;
      keyframes[0].opacity = visible ? from : to;
      keyframes[keyframes.length - 1].opacity = visible ? to : from;
    }

    const keyframeEffect = new KeyframeEffect(el, keyframes, {
      duration: (frames / 60) * 1000,
      fill: "both",
      easing: "linear",
      iterations: 1,
    });

    const animation = new Animation(keyframeEffect);

    animation.play();

    return animation;
  };

  if (wait && isAnyDefined(enter, exit)) {
    throw Error(`You cannot use wait if you use enter or exit!`);
  }

  enter = wait || enter;
  exit = wait || exit;

  const animateVisible = (el) => animateSpring(el, true);

  const playEnterAnimation = () => {
    if (!domRef.current) return;

    const animation = animateVisible(domRef.current);
    animationInstance.current = animation;

    if (enter) {
      console.debug(debugName, "Registering onfinish enter animation");
      animation.onfinish = () => enter();
    }
  };

  const handleExitAnimationEnd = (exitCb) => {
    console.debug(debugName, "Exit animation finished");
    setVariant("hidden");
    exitCb();
  };

  const togglePresence = (exitCb = noop) => {
    console.debug(debugName, `Toggled variant, currently ${variant}`);

    const playExitAnimation = () => {
      const animation = animateSpring(domRef.current, false);
      animationInstance.current = animation;

      animation.onfinish = () => {
        handleExitAnimationEnd(exitCb);
      };
    };

    if (
      animationInstance.current &&
      animationInstance.current.playState === "running"
    ) {
      animationInstance.current.reverse();

      if (!aboutToExit.current) {
        console.debug(debugName, "Reverting enter animation");

        aboutToExit.current = true;
        animationInstance.current.onfinish = () =>
          handleExitAnimationEnd(exitCb);
      } else {
        console.debug(debugName, "Reverting exit animation");

        const onFinish = () => {
          enter ? enter() : noop();
        };

        animationInstance.current.onfinish = onFinish;
        aboutToExit.current = false;
      }

      return;
    }

    if (isVisible) {
      if (exit) {
        aboutToExit.current = true;

        console.debug(debugName, "Delaying exit animation");

        exit(playExitAnimation);
        return;
      } else {
        console.debug(debugName, "Starting exit animation");

        aboutToExit.current = true;
        playExitAnimation();
      }
    } else {
      console.debug(debugName, "Switching to visible");

      aboutToExit.current = false;
      setVariant("visible");
    }
  };

  React.useLayoutEffect(() => {
    if (!domRef.current) {
      console.debug(debugName, "domRef not found!");
      didRender.current && console.log(debugName, "unmounted");
      return;
    }

    const shouldAnimateFirstRender = !didRender.current && animateFirstRender;

    if (shouldAnimateFirstRender) {
      console.debug(debugName, "Animating first render");

      return playEnterAnimation();
    }

    if (isVisible) {
      console.debug(debugName, "Playing enter animation");
      console.log(debugName, "mounted");

      playEnterAnimation();
    }
  }, [isVisible, debugName, animateFirstRender]);

  React.useLayoutEffect(() => {
    if (!didRender.current && isVisible) {
      console.debug(debugName, "Rendered");
      didRender.current = true;
    }
  }, [isVisible]);

  return { ref: domRef, isRendered: isVisible, togglePresence };
};
