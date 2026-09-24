import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';

/**
 * Flutter 3D Character Controller
 *
 * Setup in pubspec.yaml:
 * 
 * dependencies:
 *   flutter:
 *     sdk: flutter
 *   model_viewer_plus: ^1.7.0
 * 
 * flutter:
 *   assets:
 *     - assets/lowpoly_old_man.glb
 *
 * Android permissions (android/app/src/main/AndroidManifest.xml):
 *   <uses-permission android:name="android.permission.INTERNET"/>
 *   In <application android:usesCleartextTraffic="true" ...>
 */
void main() {
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: Character3DViewerScreen(),
  ));
}

class Character3DViewerScreen extends StatefulWidget {
  const Character3DViewerScreen({super.key});

  @override
  State<Character3DViewerScreen> createState() => _Character3DViewerScreenState();
}

class _Character3DViewerScreenState extends State<Character3DViewerScreen> {
  // Available animations in the GLB file: 'talking' (default) and 'walking'
  String _activeAnimation = 'talking';
  bool _isPlaying = true;

  void _switchAnimation(String animName) {
    setState(() {
      _activeAnimation = animName;
      _isPlaying = true;
    });
  }

  void _togglePlayPause() {
    setState(() {
      _isPlaying = !_isPlaying;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF181A20),
      appBar: AppBar(
        title: const Text(
          '3D Character Viewer',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF262A34),
        elevation: 2,
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Status bar
            Container(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
              color: const Color(0xFF1E212A),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        _isPlaying ? Icons.play_circle_fill : Icons.pause_circle_filled,
                        color: _isPlaying ? Colors.greenAccent : Colors.orangeAccent,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Action: ${_activeAnimation.toUpperCase()}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    _isPlaying ? 'Playing' : 'Paused',
                    style: TextStyle(
                      color: _isPlaying ? Colors.greenAccent : Colors.orangeAccent,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // 3D Model Viewport
            Expanded(
              child: Container(
                color: const Color(0xFF121418),
                child: ModelViewer(
                  key: ValueKey('$_activeAnimation-$_isPlaying'),
                  // Path to local asset or network URL
                  src: 'assets/lowpoly_old_man.glb',
                  alt: '3D Lowpoly Old Man Character',
                  ar: true,
                  autoRotate: false,
                  cameraControls: true,
                  backgroundColor: const Color(0xFF121418),
                  // Specify animation to play: 'walking' or 'talking'
                  animationName: _isPlaying ? _activeAnimation : null,
                  autoPlay: _isPlaying,
                  shadowIntensity: 1.0,
                  shadowSoftness: 0.8,
                  exposure: 1.2,
                ),
              ),
            ),

            // Control Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: const BoxDecoration(
                color: Color(0xFF262A34),
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Walk Button
                  _buildActionButton(
                    label: 'Walk',
                    icon: Icons.directions_walk,
                    isSelected: _activeAnimation == 'walking' && _isPlaying,
                    onTap: () => _switchAnimation('walking'),
                  ),

                  // Talk Button
                  _buildActionButton(
                    label: 'Talk',
                    icon: Icons.record_voice_over,
                    isSelected: _activeAnimation == 'talking' && _isPlaying,
                    onTap: () => _switchAnimation('talking'),
                  ),

                  // Play / Pause Button
                  _buildActionButton(
                    label: _isPlaying ? 'Pause' : 'Play',
                    icon: _isPlaying ? Icons.pause : Icons.play_arrow,
                    isSelected: false,
                    onTap: _togglePlayPause,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 20, color: Colors.white),
      label: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: isSelected ? const Color(0xFF3B82F6) : const Color(0xFF374151),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: isSelected
              ? const BorderSide(color: Color(0xFF60A5FA), width: 2)
              : BorderSide.none,
        ),
      ),
    );
  }
}
