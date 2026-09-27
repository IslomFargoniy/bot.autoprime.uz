import 'dart:async';
import 'package:flutter/material.dart';
import '../models/ticket.dart';
import '../models/question.dart';
import '../models/answer.dart';
import '../services/quiz_service.dart';

enum QuizMode { none, ticket, exam }

class QuizProvider extends ChangeNotifier {
  final QuizService _quizService = QuizService();

  QuizMode _mode = QuizMode.none;
  Ticket? _activeTicket;
  int? _examAttemptId;
  List<Question> _questions = [];
  int _currentIndex = 0;
  final Map<int, int> _selectedAnswers = {}; // questionId -> answerId
  final Map<int, bool> _revealedQuestions = {};

  int _timeLeftSeconds = 25 * 60;
  Timer? _timer;
  bool _isTimerRunning = false;

  double _fontSize = 16.0;
  bool _isExplanationEnabled = false;
  bool _showExplanationDialog = false;

  Map<String, dynamic>? _quizResult;

  // Getters
  QuizMode get mode => _mode;
  Ticket? get activeTicket => _activeTicket;
  List<Question> get questions => _questions;
  int get currentIndex => _currentIndex;
  Question? get currentQuestion =>
      _questions.isNotEmpty && _currentIndex < _questions.length
          ? _questions[_currentIndex]
          : null;
  Map<int, int> get selectedAnswers => _selectedAnswers;
  Map<int, bool> get revealedQuestions => _revealedQuestions;
  int get timeLeftSeconds => _timeLeftSeconds;
  double get fontSize => _fontSize;
  bool get isExplanationEnabled => _isExplanationEnabled;
  bool get showExplanationDialog => _showExplanationDialog;
  Map<String, dynamic>? get quizResult => _quizResult;
  bool get isQuizFinished => _quizResult != null;

  // Start Ticket Quiz
  Future<void> startTicketQuiz(Ticket ticket) async {
    _mode = QuizMode.ticket;
    _activeTicket = ticket;
    _examAttemptId = null;
    _selectedAnswers.clear();
    _revealedQuestions.clear();
    _quizResult = null;
    _currentIndex = 0;
    _timeLeftSeconds = 25 * 60;

    final fullTicket = await _quizService.fetchTicketQuestions(ticket.id);
    if (fullTicket != null && fullTicket.questions != null) {
      _questions = fullTicket.questions!;
      _startTimer();
      notifyListeners();
    }
  }

  // Start Internal Mock Exam
  Future<void> startMockExam() async {
    _mode = QuizMode.exam;
    _activeTicket = null;
    _selectedAnswers.clear();
    _revealedQuestions.clear();
    _quizResult = null;
    _currentIndex = 0;
    _timeLeftSeconds = 25 * 60;

    final res = await _quizService.startMockExam();
    if (res != null) {
      _examAttemptId = res['attempt_id'];
      _questions = res['questions'];
      _startTimer();
      notifyListeners();
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _isTimerRunning = true;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_timeLeftSeconds <= 1) {
        _timer?.cancel();
        _isTimerRunning = false;
        submitQuiz(autoTimeout: true);
      } else {
        _timeLeftSeconds--;
        notifyListeners();
      }
    });
  }

  // Select Answer
  void selectAnswer(int questionId, int answerId) {
    if (isQuizFinished) return;

    _selectedAnswers[questionId] = answerId;
    _revealedQuestions[questionId] = true;

    if (_isExplanationEnabled) {
      _showExplanationDialog = true;
    } else {
      Future.delayed(const Duration(milliseconds: 350), () {
        nextQuestion();
      });
    }
    notifyListeners();
  }

  // Select Answer by Index (0 for F1/1, 1 for F2/2, 2 for F3/3, 3 for F4/4)
  void selectAnswerByIndex(int index) {
    final q = currentQuestion;
    if (q == null || index >= q.answers.length) return;
    selectAnswer(q.id, q.answers[index].id);
  }

  void goToQuestion(int index) {
    if (index >= 0 && index < _questions.length) {
      _currentIndex = index;
      _showExplanationDialog = false;
      notifyListeners();
    }
  }

  void nextQuestion() {
    if (_currentIndex < _questions.length - 1) {
      _currentIndex++;
      _showExplanationDialog = false;
      notifyListeners();
    }
  }

  void prevQuestion() {
    if (_currentIndex > 0) {
      _currentIndex--;
      _showExplanationDialog = false;
      notifyListeners();
    }
  }

  void toggleExplanationEnabled() {
    _isExplanationEnabled = !_isExplanationEnabled;
    notifyListeners();
  }

  void openExplanation() {
    _showExplanationDialog = true;
    notifyListeners();
  }

  void closeExplanation() {
    _showExplanationDialog = false;
    notifyListeners();
  }

  void changeFontSize(double delta) {
    _fontSize = (_fontSize + delta).clamp(12.0, 26.0);
    notifyListeners();
  }

  // Submit Quiz
  Future<void> submitQuiz({bool autoTimeout = false}) async {
    _timer?.cancel();
    _isTimerRunning = false;

    final durationSeconds = (25 * 60) - _timeLeftSeconds;
    final answersPayload = _questions.map((q) {
      return {
        'question_id': q.id,
        'answer_id': _selectedAnswers[q.id],
      };
    }).toList();

    final result = await _quizService.submitAttempt(
      attemptId: _examAttemptId,
      ticketId: _activeTicket?.id,
      attemptType: _mode == QuizMode.exam ? 'random_mock' : 'ticket_exam',
      durationSeconds: durationSeconds,
      answers: answersPayload,
    );

    if (result != null && result['success'] == true) {
      _quizResult = result;
      notifyListeners();
    }
  }

  void exitQuiz() {
    _timer?.cancel();
    _mode = QuizMode.none;
    _questions = [];
    _quizResult = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
