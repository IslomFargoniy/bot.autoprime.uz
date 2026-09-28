class ApiConstants {
  static const String baseUrl = 'https://lms.autoprime.uz';

  // Desktop Auth & Updates
  static const String versionCheck = '$baseUrl/api/desktop/version-check';
  static const String sendOtp = '$baseUrl/api/desktop/auth/send-otp';
  static const String verifyOtp = '$baseUrl/api/desktop/auth/verify-otp';
  static const String ping = '$baseUrl/api/desktop/auth/ping';
  static const String dashboard = '$baseUrl/api/desktop/student/dashboard';

  // Tests & Quizzes
  static const String tickets = '$baseUrl/api/tests/tickets';
  static String ticketQuestions(int ticketId) => '$baseUrl/api/tests/ticket/$ticketId';
  static const String mockExam = '$baseUrl/api/tests/exam';
  static const String submitExam = '$baseUrl/api/tests/submit';
  static const String signs = '$baseUrl/api/tests/signs';
  static const String stats = '$baseUrl/api/tests/stats';

  // Storage helper
  static String formatImageUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    final cleanPath = url.replaceAll(RegExp(r'^/+'), '');
    if (cleanPath.startsWith('storage/')) {
      return '$baseUrl/$cleanPath';
    }
    return '$baseUrl/storage/$cleanPath';
  }
}
