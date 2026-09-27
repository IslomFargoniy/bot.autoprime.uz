import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const _storage = FlutterSecureStorage();
  static const String _keyToken = 'auth_token';
  static const String _keySessionId = 'desktop_session_id';
  static const String _keyDeviceUuid = 'device_uuid';
  static const String _keySelectedLang = 'selected_language';

  // Save Token & Session ID
  static Future<void> saveSession({
    required String token,
    required String sessionId,
  }) async {
    await _storage.write(key: _keyToken, value: token);
    await _storage.write(key: _keySessionId, value: sessionId);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _keyToken);
  }

  static Future<String?> getSessionId() async {
    return await _storage.read(key: _keySessionId);
  }

  static Future<void> clearSession() async {
    await _storage.delete(key: _keyToken);
    await _storage.delete(key: _keySessionId);
  }

  // Get or Generate Unique Machine GUID (Device UUID)
  static Future<String> getDeviceUuid() async {
    final prefs = await SharedPreferences.getInstance();
    String? uuid = prefs.getString(_keyDeviceUuid);

    if (uuid != null && uuid.isNotEmpty) {
      return uuid;
    }

    final deviceInfo = DeviceInfoPlugin();
    try {
      if (Platform.isWindows) {
        final windowsInfo = await deviceInfo.windowsInfo;
        uuid = windowsInfo.deviceId.isNotEmpty ? windowsInfo.deviceId : windowsInfo.computerName;
      } else if (Platform.isMacOS) {
        final macInfo = await deviceInfo.macOsInfo;
        uuid = macInfo.systemGUID ?? macInfo.computerName;
      } else {
        uuid = 'DESKTOP-${DateTime.now().millisecondsSinceEpoch}';
      }
    } catch (_) {
      uuid = 'DESKTOP-${DateTime.now().millisecondsSinceEpoch}';
    }

    await prefs.setString(_keyDeviceUuid, uuid);
    return uuid;
  }

  // Language Preference
  static Future<String> getLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keySelectedLang) ?? 'uz';
  }

  static Future<void> setLanguage(String lang) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keySelectedLang, lang);
  }
}
