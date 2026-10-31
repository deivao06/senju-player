import React, { forwardRef, memo, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PlaylistItem } from '@senju/iptv';
import { Icon } from './Icon';
import { colors } from './theme';

export type FocusedItemHandle = { show: (item: PlaylistItem) => void };
// One discovery hint per app session, including after returning from the player.
let hintShown = false;
/** D-pad changes update only this small caption, never state on the catalog/grid. */
export const FocusedItemInfo = memo(
  forwardRef<FocusedItemHandle, { favorites: string[]; empty: boolean }>(function FocusedItemInfo(
    { favorites, empty },
    ref,
  ) {
    const [item, setItem] = useState<PlaylistItem | null>(null);
    const [showHint, setShowHint] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useImperativeHandle(
      ref,
      () => ({
        show: (item) => {
          setItem(item);
          if (!hintShown) {
            hintShown = true;
            setShowHint(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setShowHint(false), 4000);
          }
        },
      }),
      [],
    );
    useEffect(
      () => () => {
        if (timer.current) clearTimeout(timer.current);
      },
      [],
    );
    const favorite = !!item && favorites.includes(item.id);
    return (
      <View style={styles.row} pointerEvents="none">
        {!empty && item && (
          <>
            <Text style={styles.title} numberOfLines={2}>
              {item.name}
            </Text>
            {(showHint || favorite) && (
              <View style={styles.action}>
                <Icon name="heart" size={12} color={favorite ? colors.accent : colors.muted} />
                <Text style={styles.hint}>
                  {showHint
                    ? favorite
                      ? 'Segure OK para remover'
                      : 'Segure OK para favoritar'
                    : 'Favorito'}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  }),
);
const styles = StyleSheet.create({
  row: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 4 },
  title: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: '500' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  hint: { fontSize: 11, color: colors.muted },
});
