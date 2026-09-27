import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'constants/app_colors.dart';
import 'providers/auth_provider.dart';
import 'providers/dashboard_provider.dart';
import 'providers/quiz_provider.dart';
import 'providers/update_provider.dart';
import 'screens/auth/phone_input_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/widgets/session_terminated_dialog.dart';
import 'screens/widgets/update_dialog.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Dio and Interceptors
  ApiService.init();

  runApp(const AutoPrimeDesktopApp());
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class AutoPrimeDesktopApp extends StatelessWidget {
  const AutoPrimeDesktopApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => QuizProvider()),
        ChangeNotifierProvider(create: (_) => UpdateProvider()),
      ],
      child: Consumer2<AuthProvider, UpdateProvider>(
        builder: (context, auth, updateProv, _) {
          // Listen for single device session superseded event
          ApiService.onSessionSuperseded = (reason) {
            auth.onSessionTerminated(reason);
            final ctx = navigatorKey.currentContext;
            if (ctx != null) {
              showDialog(
                context: ctx,
                barrierDismissible: false,
                builder: (_) => SessionTerminatedDialog(
                  message: reason,
                  onDismiss: () => Navigator.of(ctx).popUntil((route) => route.isFirst),
                ),
              );
            }
          };

          return MaterialApp(
            navigatorKey: navigatorKey,
            title: 'AutoPrime LMS',
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              useMaterial3: true,
              brightness: Brightness.dark,
              scaffoldBackgroundColor: AppColors.bgDark,
              colorScheme: const ColorScheme.dark(
                primary: AppColors.primary,
                surface: AppColors.cardDark,
                background: AppColors.bgDark,
              ),
              textTheme: GoogleFonts.interTextTheme(
                ThemeData(brightness: Brightness.dark).textTheme,
              ),
            ),
            home: const AppRootScreen(),
          );
        },
      ),
    );
  }
}

class AppRootScreen extends StatefulWidget {
  const AppRootScreen({super.key});

  @override
  State<AppRootScreen> createState() => _AppRootScreenState();
}

class _AppRootScreenState extends State<AppRootScreen> {
  @override
  void initState() {
    super.initState();
    // Check for auto-update on boot
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<UpdateProvider>().checkForUpdates();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final update = context.watch<UpdateProvider>();

    return Stack(
      children: [
        // Main Screen
        if (auth.status == AuthStatus.loading || auth.status == AuthStatus.initial)
          const Scaffold(
            backgroundColor: AppColors.bgDark,
            body: Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          )
        else if (auth.isAuthenticated)
          const DashboardScreen()
        else
          const PhoneInputScreen(),

        // Auto-Update Popup (if update is available on server)
        if (update.hasUpdate)
          const UpdateDialog(),
      ],
    );
  }
}
