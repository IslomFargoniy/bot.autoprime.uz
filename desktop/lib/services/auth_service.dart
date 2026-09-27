import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../models/student.dart';
import 'api_service.dart';
import 'storage_service.dart';

class AuthService {
  final Dio _dio = ApiService.dio;

  // Send 6-digit OTP to student's Telegram account
  Future<Map<String, dynamic>> sendOtp(String phone) async {
    try {
      final response = await _dio.post(
        ApiConstants.sendOtp,
        data: {'phone': phone.trim()},
      );

      return {
        'success': response.data['success'] == true,
        'message': response.data['message'] ?? 'Tasdiqlash kodi yuborildi.',
      };
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ??
          'Server bilan bog\'lanishda xatolik yuz berdi.';
      return {'success': false, 'message': msg};
    } catch (_) {
      return {'success': false, 'message': 'Noma\'lum xatolik yuz berdi.'};
    }
  }

  // Verify OTP & Store Single Active Session Token
  Future<Map<String, dynamic>> verifyOtp({
    required String phone,
    required String otp,
  }) async {
    try {
      final deviceUuid = await StorageService.getDeviceUuid();

      final response = await _dio.post(
        ApiConstants.verifyOtp,
        data: {
          'phone': phone.trim(),
          'otp': otp.trim(),
          'device_uuid': deviceUuid,
        },
      );

      if (response.data['success'] == true) {
        final token = response.data['token'] as String;
        final sessionId = response.data['session_id'] as String;
        final studentJson = response.data['student'];

        await StorageService.saveSession(token: token, sessionId: sessionId);

        return {
          'success': true,
          'student': Student.fromJson(studentJson),
          'message': response.data['message'] ?? 'Muvaffaqiyatli kirildi.',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Xatolik yuz berdi.',
      };
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ??
          'Kodni tekshirishda xatolik yuz berdi.';
      return {'success': false, 'message': msg};
    } catch (_) {
      return {'success': false, 'message': 'Noma\'lum xatolik yuz berdi.'};
    }
  }

  // Fetch full student dashboard payload
  Future<Map<String, dynamic>> fetchDashboard() async {
    try {
      final response = await _dio.get(ApiConstants.dashboard);

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'success': true,
          'student': Student.fromJson(response.data['student']),
          'contract': response.data['contract'] != null
              ? ContractInfo.fromJson(response.data['contract'])
              : null,
          'group': response.data['group'] != null
              ? GroupInfo.fromJson(response.data['group'])
              : null,
          'topics': response.data['topics'] ?? [],
          'drivings': response.data['drivings'] ?? [],
          'attendances': response.data['attendances'] ?? [],
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Ma\'lumotlarni yuklab bo\'lmadi.',
      };
    } on DioException catch (e) {
      return {
        'success': false,
        'code': e.response?.data?['code'],
        'message': e.response?.data?['message'] ?? 'Server bilan aloqa uzildi.',
      };
    }
  }

  // Logout
  Future<void> logout() async {
    await StorageService.clearSession();
  }
}
