import 'dart:async';
import 'package:flutter/material.dart';
import '../constants/api_constants.dart';
import '../models/student.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';

enum AuthStatus { initial, unauthenticated, authenticated, loading }

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  Timer? _heartbeatTimer;

  AuthStatus _status = AuthStatus.initial;
  Student? _student;
  String? _errorMessage;
  String _currentLanguage = 'uz';

  AuthStatus get status => _status;
  Student? get student => _student;
  String? get errorMessage => _errorMessage;
  String get currentLanguage => _currentLanguage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  AuthProvider() {
    _initAuth();
  }

  Future<void> _initAuth() async {
    _currentLanguage = await StorageService.getLanguage();
    final token = await StorageService.getToken();

    if (token != null && token.isNotEmpty) {
      final res = await _authService.fetchDashboard();
      if (res['success'] == true) {
        _student = res['student'];
        _status = AuthStatus.authenticated;
        _startHeartbeat();
      } else {
        await StorageService.clearSession();
        _status = AuthStatus.unauthenticated;
      }
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 4), (_) async {
      if (_status != AuthStatus.authenticated) {
        _heartbeatTimer?.cancel();
        return;
      }
      try {
        await ApiService.dio.get(ApiConstants.ping);
      } catch (_) {
        // Any 401 error is automatically intercepted by ApiService and triggers onSessionSuperseded
      }
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  Future<bool> sendOtp(String phone) async {
    _errorMessage = null;
    final res = await _authService.sendOtp(phone);
    if (res['success'] != true) {
      _errorMessage = res['message'];
      notifyListeners();
      return false;
    }
    return true;
  }

  Future<bool> verifyOtp(String phone, String otp) async {
    _errorMessage = null;
    _status = AuthStatus.loading;
    notifyListeners();

    final res = await _authService.verifyOtp(phone: phone, otp: otp);
    if (res['success'] == true) {
      _student = res['student'];
      _status = AuthStatus.authenticated;
      _startHeartbeat();
      notifyListeners();
      return true;
    } else {
      _errorMessage = res['message'];
      _status = AuthStatus.unauthenticated;
      _stopHeartbeat();
      notifyListeners();
      return false;
    }
  }

  Future<void> changeLanguage(String lang) async {
    _currentLanguage = lang;
    await StorageService.setLanguage(lang);
    notifyListeners();
  }

  void onSessionTerminated(String reason) {
    _stopHeartbeat();
    _student = null;
    _status = AuthStatus.unauthenticated;
    _errorMessage = reason;
    notifyListeners();
  }

  Future<void> logout() async {
    _stopHeartbeat();
    await _authService.logout();
    _student = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  @override
  void dispose() {
    _stopHeartbeat();
    super.dispose();
  }
}
