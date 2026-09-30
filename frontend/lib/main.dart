import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/sync_service.dart';
import 'services/local_db_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  await LocalDbService.instance.init();
  runApp(NAWIApp(prefs: prefs));
}

class NAWIApp extends StatelessWidget {
  final SharedPreferences prefs;
  const NAWIApp({super.key, required this.prefs});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService(prefs)),
        ChangeNotifierProvider(create: (_) => SyncService()),
        Provider(create: (_) => ApiService(prefs)),
      ],
      child: MaterialApp(
        title: 'NAWI Platform',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        home: Consumer<AuthService>(
          builder: (ctx, auth, _) => auth.isLoggedIn ? const HomeScreen() : const LoginScreen(),
        ),
      ),
    );
  }
}
