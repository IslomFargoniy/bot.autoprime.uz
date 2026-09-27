import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../models/ticket.dart';
import '../models/question.dart';
import 'api_service.dart';

class QuizService {
  final Dio _dio = ApiService.dio;

  // Fetch all 130 tickets
  Future<List<Ticket>> fetchTickets() async {
    try {
      final response = await _dio.get(ApiConstants.tickets);
      if (response.statusCode == 200 && response.data['success'] == true) {
        final rawList = response.data['tickets'] as List;
        return rawList.map((t) => Ticket.fromJson(t)).toList();
      }
    } catch (_) {}
    return [];
  }

  // Fetch single ticket questions
  Future<Ticket?> fetchTicketQuestions(int ticketId) async {
    try {
      final response = await _dio.get(ApiConstants.ticketQuestions(ticketId));
      if (response.statusCode == 200 && response.data['success'] == true) {
        return Ticket.fromJson(response.data['ticket']);
      }
    } catch (_) {}
    return null;
  }

  // Start internal mock exam (20 random questions)
  Future<Map<String, dynamic>?> startMockExam() async {
    try {
      final response = await _dio.get(ApiConstants.mockExam);
      if (response.statusCode == 200 && response.data['success'] == true) {
        final rawQuestions = response.data['questions'] as List;
        return {
          'attempt_id': response.data['attempt_id'],
          'duration_minutes': response.data['duration_minutes'] ?? 25,
          'total_questions': response.data['total_questions'] ?? 20,
          'passing_score': response.data['passing_score'] ?? 18,
          'questions': rawQuestions.map((q) => Question.fromJson(q)).toList(),
        };
      }
    } catch (_) {}
    return null;
  }

  // Submit test/exam attempt
  Future<Map<String, dynamic>?> submitAttempt({
    int? attemptId,
    int? ticketId,
    required String attemptType,
    required int durationSeconds,
    required List<Map<String, dynamic>> answers,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.submitExam,
        data: {
          'attempt_id': attemptId,
          'ticket_id': ticketId,
          'attempt_type': attemptType,
          'duration_seconds': durationSeconds,
          'answers': answers,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data;
      }
    } catch (_) {}
    return null;
  }

  // Fetch signs and road lines
  Future<Map<String, dynamic>> fetchSigns() async {
    try {
      final response = await _dio.get(ApiConstants.signs);
      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'categories': response.data['categories'] ?? [],
          'road_lines': response.data['road_lines'] ?? [],
        };
      }
    } catch (_) {}
    return {'categories': [], 'road_lines': []};
  }

  // Fetch student stats
  Future<Map<String, dynamic>> fetchStats() async {
    try {
      final response = await _dio.get(ApiConstants.stats);
      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data;
      }
    } catch (_) {}
    return {'total_attempts': 0, 'passed_exam': false, 'attempts': []};
  }
}
