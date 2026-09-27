import 'package:flutter/material.dart';
import '../models/student.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';

enum AuthStatus { initial, unauthenticated, authenticated, loading }

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

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
      } else {
        await StorageService.clearSession();
        _status = AuthStatus.unauthenticated;
      }
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
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
      notifyListeners();
      return true;
    } else {
      _errorMessage = res['message'];
      _status = AuthStatus.unauthenticated;
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
    _student = null;
    _status = AuthStatus.unauthenticated;
    _errorMessage = reason;
    notifyListeners();
  }

  Future<void> logout() async {
    await _authService.logout();
    _student = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
