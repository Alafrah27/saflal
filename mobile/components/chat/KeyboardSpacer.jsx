import { useEffect } from "react";
import { Keyboard, Platform } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Bottom spacer that grows with the keyboard so the composer above it stays
// visible. It does not depend on layout measurement, and it falls back to the
// standard React Native keyboard events if native keyboard-controller events are
// unavailable. Taking the max of both sources avoids double padding.
export default function KeyboardSpacer({ includeBottomInset = false }) {
  const { height } = useReanimatedKeyboardAnimation();
  const fallbackHeight = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const bottomInset = includeBottomInset ? insets.bottom : 0;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => {
      fallbackHeight.value = e?.endCoordinates?.height ?? 0;
    });
    const hide = Keyboard.addListener(hideEvent, () => { fallbackHeight.value = 0; });
    return () => { show.remove(); hide.remove(); };
  }, [fallbackHeight]);

  const style = useAnimatedStyle(() => ({
    // keyboard-controller reports height as a negative translation value.
    height: Math.max(Math.abs(height.value), fallbackHeight.value, bottomInset),
  }), [bottomInset]);

  return <Animated.View style={style} />;
}
