import React from "react";
import { createSpringAnimation } from "springframes";

const isAnyDefined = (...args) =>
  args.some((arg) => arg !== undefined && arg !== null);

const noop = () => {};

export type Variant = "visible" | "hidden";

export type PresenceParameters = {
  variants: any;
  initial: Variant;
  animateFirstRender?: boolean;
  enter?: (...args: any) => void;
  exit?: (...args: any) => void;
  wait?: (...args: any) => void;
  debugName?: string;
};

export const useDeferredStateSpring = ({
  variants,
  initial,
  animateFirstRender = true,
  enter,
  exit,
  wait,
  debugName = "unknown",
}: PresenceParameters) => {
  const [variant, setVariant] = React.useState(initial);
  const didRender = React.useRef(false);
  const animationInstance = React.useRef();
  const domRef = React.useRef();
  const aboutToExit = React.useRef(false);

  const isVisible = variant === "visible";

  const animateSpring = (el, visible) => {
    const variantsX = variants.x || { from: 0, to: 0 };
    const variantsY = variants.y || { from: 0, to: 0 };

    const diffX = variantsX.from - variantsX.to;
    const diffY = variantsY.from - variantsY.to;

    const { keyframes, frames } = createSpringAnimation({
      dx: diffX,
      dy: diffY,
      stiffness: 150,
      mass: 3,
      damping: 27,
      scale: 1 / 2,
      deg: 360,
      reverse: !visible,
    });

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
      animation.onfinish = enter;
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

        animationInstance.current.onfinish = enter || noop;
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
