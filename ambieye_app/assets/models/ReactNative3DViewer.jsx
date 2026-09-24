import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls } from '@react-three/drei';

/**
 * 3D Model Component with Animation Control
 * 
 * Required packages:
 * npm install three @types/three @react-three/fiber @react-three/drei expo-gl expo-three
 */
function CharacterModel({ activeAction }) {
  const group = useRef();
  
  // Load the GLB file. In React Native / Expo, place the GLB in your assets folder
  // or provide a local require: require('./assets/lowpoly_old_man.glb')
  // or a remote URI: 'https://your-domain.com/lowpoly_old_man.glb'
  const { scene, animations } = useGLTF(require('./assets/lowpoly_old_man.glb'));
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // When activeAction changes, smoothly crossfade between 'walking' and 'talking'
    if (!actions) return;

    // Fade out any currently playing animation
    Object.keys(actions).forEach((name) => {
      if (name !== activeAction && actions[name]?.isRunning()) {
        actions[name].fadeOut(0.3);
      }
    });

    // Play and fade in the selected animation
    if (activeAction && actions[activeAction]) {
      actions[activeAction]
        .reset()
        .fadeIn(0.3)
        .play();
    }

    return () => {
      // Optional cleanup on unmount
      if (activeAction && actions[activeAction]) {
        actions[activeAction].fadeOut(0.3);
      }
    };
  }, [activeAction, actions]);

  return (
    <group ref={group} dispose={null} position={[0, -1, 0]} scale={[0.025, 0.025, 0.025]}>
      <primitive object={scene} />
    </group>
  );
}

export default function ReactNative3DViewer() {
  // Available animations in lowpoly_old_man.glb: 'talking' (default) and 'walking'
  const [currentAction, setCurrentAction] = useState('talking');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>3D Character Controller</Text>
        <Text style={styles.subtitle}>Current Action: {currentAction.toUpperCase()}</Text>
      </View>

      {/* 3D Canvas */}
      <View style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 1.5, 3.5], fov: 45 }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />
          
          <CharacterModel activeAction={currentAction} />
          
          {/* Allow user to rotate and pan the character */}
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, currentAction === 'walking' && styles.btnActive]}
          onPress={() => setCurrentAction('walking')}
        >
          <Text style={[styles.btnText, currentAction === 'walking' && styles.btnTextActive]}>
            🚶 Walk
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, currentAction === 'talking' && styles.btnActive]}
          onPress={() => setCurrentAction('talking')}
        >
          <Text style={[styles.btnText, currentAction === 'talking' && styles.btnTextActive]}>
            🗣️ Talk
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, currentAction === null && styles.btnActive]}
          onPress={() => setCurrentAction(null)}
        >
          <Text style={[styles.btnText, currentAction === null && styles.btnTextActive]}>
            ⏹️ Stop
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a24',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2f3142',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#38bdf8',
    marginTop: 4,
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#12121a',
    borderTopWidth: 1,
    borderTopColor: '#2f3142',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: '#262938',
    minWidth: 90,
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: '#3b82f6',
  },
  btnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 15,
  },
  btnTextActive: {
    color: '#ffffff',
  },
});
