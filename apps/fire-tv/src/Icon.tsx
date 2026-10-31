import React from 'react';
import { View } from 'react-native';
import { colors } from './theme';

export type IconName =
  | 'info'
  | 'home'
  | 'menu'
  | 'profile'
  | 'search'
  | 'close'
  | 'left'
  | 'right'
  | 'down'
  | 'heart'
  | 'play'
  | 'pause'
  | 'rewind'
  | 'forward'
  | 'previous'
  | 'next';
/** Small geometric native icons: no icon font, image decode or extra runtime. */
export function Icon({
  name,
  size = 20,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const stroke = Math.max(1.5, size / 11);
  const line = (rotate: string, width = size * 0.62) => ({
    position: 'absolute' as const,
    width,
    height: stroke,
    backgroundColor: color,
    borderRadius: stroke,
    transform: [{ rotate }],
  });
  const chevron = (direction: 'left' | 'right' | 'down') => (
    <View
      style={{
        width: size * 0.43,
        height: size * 0.43,
        borderRightWidth: stroke,
        borderBottomWidth: stroke,
        borderColor: color,
        transform: [
          { rotate: direction === 'left' ? '135deg' : direction === 'right' ? '-45deg' : '45deg' },
        ],
      }}
    />
  );
  const triangle = (left = false) => (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: size * 0.33,
        borderBottomWidth: size * 0.33,
        borderLeftWidth: left ? 0 : size * 0.5,
        borderRightWidth: left ? size * 0.5 : 0,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
        borderRightColor: color,
      }}
    />
  );
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {name === 'info' ? (
        <View
          style={{
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <View
            style={{ width: stroke, height: stroke, borderRadius: stroke, backgroundColor: color }}
          />
          <View style={{ width: stroke, height: size * 0.24, backgroundColor: color }} />
        </View>
      ) : name === 'home' ? (
        <>
          <View
            style={{
              width: size * 0.6,
              height: size * 0.46,
              borderWidth: stroke,
              borderTopWidth: 0,
              borderColor: color,
              position: 'absolute',
              bottom: 1,
            }}
          />
          <View
            style={{
              width: size * 0.53,
              height: size * 0.53,
              borderLeftWidth: stroke,
              borderTopWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              position: 'absolute',
              top: size * 0.12,
            }}
          />
        </>
      ) : name === 'menu' ? (
        <>
          {[-0.26, 0, 0.26].map((offset) => (
            <View
              key={offset}
              style={[line('0deg'), { top: size / 2 + size * offset - stroke / 2 }]}
            />
          ))}
        </>
      ) : name === 'close' ? (
        <>
          <View style={line('45deg')} />
          <View style={line('-45deg')} />
        </>
      ) : name === 'profile' ? (
        <>
          <View
            style={{
              width: size * 0.32,
              height: size * 0.32,
              borderRadius: size,
              borderWidth: stroke,
              borderColor: color,
              position: 'absolute',
              top: 1,
            }}
          />
          <View
            style={{
              width: size * 0.67,
              height: size * 0.34,
              borderTopLeftRadius: size,
              borderTopRightRadius: size,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
              position: 'absolute',
              bottom: 1,
            }}
          />
        </>
      ) : name === 'search' ? (
        <>
          <View
            style={{
              width: size * 0.58,
              height: size * 0.58,
              borderRadius: size,
              borderWidth: stroke,
              borderColor: color,
              position: 'absolute',
              top: size * 0.1,
              left: size * 0.1,
            }}
          />
          <View style={[line('45deg', size * 0.35), { right: 0, bottom: size * 0.14 }]} />
        </>
      ) : name === 'left' || name === 'right' || name === 'down' ? (
        chevron(name)
      ) : name === 'heart' ? (
        <View
          style={{
            width: size * 0.55,
            height: size * 0.55,
            backgroundColor: color,
            borderRadius: size * 0.12,
            transform: [{ rotate: '-45deg' }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: size,
              top: -size * 0.26,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: size,
              left: size * 0.26,
              backgroundColor: color,
            }}
          />
        </View>
      ) : name === 'pause' ? (
        <View style={{ flexDirection: 'row', gap: size * 0.2 }}>
          {[0, 1].map((value) => (
            <View
              key={value}
              style={{
                width: size * 0.16,
                height: size * 0.7,
                borderRadius: 1,
                backgroundColor: color,
              }}
            />
          ))}
        </View>
      ) : name === 'play' ? (
        triangle()
      ) : name === 'rewind' || name === 'forward' ? (
        <View style={{ flexDirection: 'row', marginHorizontal: -size * 0.1 }}>
          {triangle(name === 'rewind')}
          {triangle(name === 'rewind')}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          {name === 'previous' && (
            <View style={{ width: stroke, height: size * 0.7, backgroundColor: color }} />
          )}
          {triangle(name === 'previous')}
          {name === 'next' && (
            <View style={{ width: stroke, height: size * 0.7, backgroundColor: color }} />
          )}
        </View>
      )}
    </View>
  );
}
