import React from "react";
import { createSpringAnimation, SpringParameters } from "springframes";

export type FromTo = { from: number; to: number };

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
  duration?: number;
  initial: Variant;
  animateFirstRender?: boolean;
  enter?: (fn?: () => void) => void;
  exit?: (fn?: () => void) => void;
  wait?: (fn?: () => void) => void;
  debugName?: string;
};

type AnimateSpringArgs = {
  el: any;
  variants: Variants;
  visible: boolean;
  duration?: number;
} & Required<SpringOptions>;

const isUndefined = (arg) => arg == undefined;
const isAnyDefined = (...args) => args.some((a) => !isUndefined(a));
const isNoneDefined = (...args) => args.every(isUndefined);
const isRunning = (anim?: Animation) => anim && anim.playState === "running";

const startAnimation = (el, keyframes, duration) => {
  const keyframeEffect = new KeyframeEffect(el, keyframes, {
    duration: duration,
    fill: "both",
    easing: "linear",
    iterations: 1,
  });

  const animation = new Animation(keyframeEffect);

  animation.play();

  return animation;
};

const noop = () => {};
const debug = (name: string, msg: string) => console.debug(name, msg);

const animateSpring = ({
  el,
  variants,
  stiffness,
  mass,
  damping,
  visible,
  duration = 1000,
}: AnimateSpringArgs) => {
  const x = variants.x || { from: 0, to: 0 };
  const y = variants.y || { from: 0, to: 0 };

  const scale = variants.scale ? variants.scale.to - variants.scale.from : 1;

  const { keyframes, frames } = createSpringAnimation({
    dx: x.from - x.to,
    dy: y.from - y.to,
    stiffness,
    mass,
    damping,
    scale,
    deg: variants.deg,
    reverse: !visible,
  });

  const noMove = keyframes.length === 0;

  if (variants.opacity) {
    const { from, to } = variants.opacity;
    if (noMove) {
      keyframes.push({ opacity: visible ? from : to });
      keyframes.push({ opacity: visible ? to : from });
    } else {
      keyframes[0].opacity = visible ? from : to;
      keyframes[keyframes.length - 1].opacity = visible ? to : from;
    }
  }

  return startAnimation(
    el,
    keyframes,
    noMove ? duration : (frames / 60) * 1000
  );
};

export const useAnimatePresence = ({
  variants,
  duration,
  initial,
  animateFirstRender = true,
  options = {},
  enter,
  exit,
  wait,
  debugName = "unknown",
}: Parameters) => {
  const [variant, setVariant] = React.useState<Variant>(initial);
  const didRender = React.useRef(false);
  const animationInstance = React.useRef<Animation>();
  const domRef = React.useRef<any>();
  const aboutToExit = React.useRef(false);

  const isVisible = variant === "visible";

  const { stiffness = 150, mass = 3, damping = 27 } = options;

  if (isUndefined(variants)) {
    throw Error(`You must provide variants for animation.`);
  }

  if (isUndefined(initial)) {
    throw Error(`You must provide initial value ("visible" or "hidden").`);
  }

  if (wait && isAnyDefined(enter, exit)) {
    throw Error(`You cannot use wait if enter or exit is defined.`);
  }

  enter = wait || enter;
  exit = wait || exit;

  const animateVisible = (el) =>
    animateSpring({
      el,
      variants,
      stiffness,
      duration,
      damping,
      mass,
      visible: true,
    });

  const playEnterAnimation = () => {
    if (!domRef.current) return;

    const animation = animateVisible(domRef.current);
    animationInstance.current = animation;

    if (enter) {
      debug(debugName, "Registering onfinish enter animation");
      animation.onfinish = () => enter();
    }
  };

  const handleExitAnimationEnd = (exitCb) => {
    debug(debugName, "Exit animation finished");
    setVariant("hidden");
    exitCb();
  };

  const togglePresence = (exitCb = noop) => {
    debug(debugName, `Toggled variant, currently ${variant}`);

    const playExitAnimation = () => {
      const animation = animateSpring({
        el: domRef.current,
        variants,
        stiffness,
        damping,
        duration,
        mass,
        visible: false,
      });
      animationInstance.current = animation;

      animation.onfinish = () => {
        handleExitAnimationEnd(exitCb);
      };
    };

    if (isRunning(animationInstance.current)) {
      animationInstance.current.reverse();

      if (!aboutToExit.current) {
        debug(debugName, "Reverting enter animation");

        aboutToExit.current = true;
        animationInstance.current.onfinish = () =>
          handleExitAnimationEnd(exitCb);
      } else {
        debug(debugName, "Reverting exit animation");

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

        debug(debugName, "Delaying exit animation");

        exit(playExitAnimation);
        return;
      } else {
        debug(debugName, "Starting exit animation");

        aboutToExit.current = true;
        playExitAnimation();
      }
    } else {
      debug(debugName, "Switching to visible");

      aboutToExit.current = false;
      setVariant("visible");
    }
  };

  React.useLayoutEffect(() => {
    if (!domRef.current) {
      debug(debugName, "ref is now undefined!");
      return;
    }

    const shouldAnimateFirstRender = !didRender.current && animateFirstRender;

    if (shouldAnimateFirstRender) {
      debug(debugName, "Animating first render");

      return playEnterAnimation();
    }

    if (isVisible) {
      debug(debugName, "Playing enter animation");

      playEnterAnimation();
    }
  }, [isVisible, debugName, animateFirstRender]);

  React.useLayoutEffect(() => {
    if (!didRender.current && isVisible) {
      debug(debugName, "Rendered");
      didRender.current = true;
    }
  }, [isVisible]);

  return { ref: domRef, isRendered: isVisible, togglePresence };
};
