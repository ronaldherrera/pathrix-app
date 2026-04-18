import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  width: number; // width of the parent badge in px
}

const STYLE_ID = 'thinking-bar-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes thinking-slide {
      0%   { left: 0%; }
      100% { left: 68%; }
    }
    .thinking-bar-anim {
      animation: thinking-slide 1.4s ease-in-out infinite alternate;
    }
  `;
  document.head.appendChild(el);
}

const ThinkingBar: React.FC<Props> = ({ visible }) => {
  useEffect(() => { injectKeyframes(); }, []);

  if (!visible) return null;

  return (
    <View style={styles.track}>
      {/* @ts-ignore – className is valid on RN Web */}
      <View style={styles.bar} className="thinking-bar-anim" />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    width: '32%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});

export default ThinkingBar;
