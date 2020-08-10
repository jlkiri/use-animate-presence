# use-animate-presence

A React hook for animating components when they are mounted and unmounted (added to / removed from React tree).

## Features:

- Uses Web Animation API (60fps animation off main thread)
- Spring physics based animation
- Cancelable / reversable animations
- Chainable mounts / unmounts
- Small (~1KB)

## Get started

- NPM: `npm install use-animation-presence`
- UMD: https://unpkg.com/use-animate-presence@latest/lib/use-animate-presence.umd.js

## Basic usage

```jsx
import { useAnimatePresence } from "use-animate-presence";

const variants = {
  x: { from: -800, to: 0 },
};

export default function App() {
  const animatedDiv = useAnimatePresence({
    variants,
    initial: "visible",
  });

  return (
    <div>
      <button onClick={() => animatedDiv.togglePresence()}>Toggle</button>
      {animatedDiv.isRendered && <div ref={animatedDiv.ref} />}
    </div>
  );
}
```

Play with the code here:

[![Edit use-animate-presence-basic-demo](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/use-animate-presence-basic-demo-fpwy0?fontsize=14&hidenavigation=1&theme=dark)

## Advanced usage

`useAnimatePresence` takes one object as an argument. Below is a table with possible properties and their description (some properties are explained in detail later):

|       Property       |   Default    | Required |          Type          |                                 Details                                 |
| :------------------: | :----------: | :------: | :--------------------: | :---------------------------------------------------------------------: |
|      `variants`      |      -       |  `true`  |        `object`        |                    Properties and values to animate                     |
|      `initial`       |      -       |  `true`  | `"hidden" | "visible"` |                   Whether item is rendered initially                    |
| `animateFirstRender` |    `true`    | `false`  |       `boolean`        |            Whether to animate on first render (first mount)             |
|       `enter`        | `undefined`  | `false`  |       `function`       |          Function to execute when enter animation is finished           |
|        `exit`        | `undefined`  | `false`  |       `function`       |           Function to execute when exit animation is finished           |
|        `wait`        | `undefined`  | `false`  |       `function`       | Function to execute both when enter and when exit animation is finished |
|     `debugName`      | `"unknown"`  | `false`  |        `string`        |          Name for tracking the animation lifecycle of the hook          |
|      `duration`      |    `1000`    | `false`  |        `number`        |        Animation duration (ms) (use if you only animate opacity)        |
|      `options`       | (read below) | `false`  |        `object`        |           Spring options (stiffness, mass and damping ratio)            |

### Return value

`useAnimatePresence` returns an object which contains a function that can toggle presence, a ref that you need to attach to the element you want to animate and a `isRendered` property which you can use to conditionally render elements.

|     Property     |                           Details                            |
| :--------------: | :----------------------------------------------------------: |
|      `ref`       |                         React `ref`                          |
| `togglePresence` |        Function that toggles presence (and animates)         |
|   `isRendered`   | Boolean that should be used to conditionally render elements |

### Variants

Variants look like this:

```javascript
const variants = {
  x: { from: -800, to: 0 },
  deg: 360,
};
```

Except for `deg`, which is degrees of rotation, every property must have a `from` value and a `to` value. All possible properties are: `x`, `y`, `deg`, `opacity` and `scale` (`scale` is experimental and might not work as intended).

### `enter`, `exit` and `wait`

These are callbacks to

### Spring options

Springs have stiffness, mass and damping ratio. The defaults are: stiffness `150`, mass `3` and damping `27`. You can customize the parameters like this:

```javascript
useAnimatePresence({
  variants,
  initial: "visible",
  options: {
    stiffness: 500,
  },
});
```
