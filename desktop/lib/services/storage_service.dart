import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _keyToken = 'auth_token';
  static const String _keySessionId = 'desktop_session_id';
  static const String _keyDeviceUuid = 'device_uuid';
  static const String _keySelectedLang = 'selected_language';

  // Save Token & Session ID
  static Future<void> saveSession({
    required String token,
    required String sessionId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, token);
    await prefs.setString(_keySessionId, sessionId);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyToken);
  }

  static Future<String?> getSessionId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keySessionId);
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keySessionId);
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
