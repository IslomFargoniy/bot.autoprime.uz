import 'package:dio/dio.dart';
import 'storage_service.dart';

class ApiService {
  static final Dio dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  ));

  // Global callback for session termination
  static void Function(String message)? onSessionSuperseded;

  static void init() {
    dio.interceptors.clear();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await StorageService.getToken();
          final sessionId = await StorageService.getSessionId();

          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          if (sessionId != null && sessionId.isNotEmpty) {
            options.headers['X-Desktop-Session-Id'] = sessionId;
          }

          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            final data = error.response?.data;
            String msg = 'Hisobingizga boshqa kompyuterdan kirilgani sababli ushbu desktop sessiyasi to\'xtatildi.';
            if (data is Map && data['message'] != null && data['message'].toString().trim().isNotEmpty) {
              msg = data['message'].toString();
            }
            await StorageService.clearSession();
            onSessionSuperseded?.call(msg);
          }
          return handler.next(error);
        },
      ),
    );
  }

  static String formatImageUrl(dynamic path) {
    if (path == null || path.toString().isEmpty) return '';
    final str = path.toString();
    if (str.startsWith('http://') || str.startsWith('https://')) return str;
    if (str.startsWith('/')) return 'https://lms.autoprime.uz$str';
    return 'https://lms.autoprime.uz/$str';
  }
}
