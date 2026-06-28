import 'package:flutter/material.dart';

import '../core/theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: BrandColors.c500,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('🍗', style: TextStyle(fontSize: 64)),
            SizedBox(height: 16),
            Text('Chikenhot',
                style: TextStyle(
                    color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
            SizedBox(height: 24),
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
            ),
          ],
        ),
      ),
    );
  }
}
