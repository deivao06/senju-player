import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { findNodeHandle, TVEventHandler, type TextInput, type View } from 'react-native';

// One native subscription for the screen; a focus move updates only two controls.
const controls = new Map<number, (focused: boolean) => void>();
let focusedTag: number | undefined;
let subscription: ReturnType<typeof TVEventHandler.addListener> | undefined;
function subscribe(tag: number, update: (focused: boolean) => void) {
  controls.set(tag, update);
  if (!subscription) {
    subscription = TVEventHandler.addListener((event) => {
      if (event.eventType === 'focus' && event.tag !== focusedTag) {
        if (focusedTag != null) controls.get(focusedTag)?.(false);
        focusedTag = event.tag;
        if (focusedTag != null) controls.get(focusedTag)?.(true);
      } else if (event.eventType === 'blur' && event.tag === focusedTag) {
        if (focusedTag != null) controls.get(focusedTag)?.(false);
        focusedTag = undefined;
      }
    });
  }
  return () => {
    controls.delete(tag);
    if (!controls.size) {
      subscription?.remove();
      subscription = undefined;
      focusedTag = undefined;
    }
  };
}
/** Keep highlights synchronized with Android's real D-pad focus, including legacy RN TV. */
export function useTVFocus(ref: RefObject<View | TextInput | null>, onFocus?: () => void) {
  const [focused, setFocused] = useState(false);
  const current = useRef(false);
  const callback = useRef(onFocus);
  callback.current = onFocus;
  const updateFocus = useCallback((next: boolean) => {
    if (current.current === next) return;
    current.current = next;
    setFocused(next);
    if (next) callback.current?.();
  }, []);
  useEffect(() => {
    const tag = findNodeHandle(ref.current);
    if (tag == null) return;
    return subscribe(tag, updateFocus);
  }, [ref, updateFocus]);
  return { focused, updateFocus };
}
