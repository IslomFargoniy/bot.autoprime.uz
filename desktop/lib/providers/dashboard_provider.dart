import 'package:flutter/material.dart';
import '../models/student.dart';
import '../models/ticket.dart';
import '../services/auth_service.dart';
import '../services/quiz_service.dart';

class DashboardProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final QuizService _quizService = QuizService();

  bool _isLoading = true;
  Student? _student;
  ContractInfo? _contract;
  GroupInfo? _group;
  List<dynamic> _topics = [];
  List<dynamic> _drivings = [];
  List<dynamic> _attendances = [];

  List<Ticket> _tickets = [];
  List<dynamic> _signCategories = [];
  List<dynamic> _roadLines = [];
  Map<String, dynamic> _stats = {};

  int _selectedTabIndex = 0; // 0: Overview, 1: Tickets, 2: LMS, 3: Drivings, 4: Signs

  // Getters
  bool get isLoading => _isLoading;
  Student? get student => _student;
  ContractInfo? get contract => _contract;
  GroupInfo? get group => _group;
  List<dynamic> get topics => _topics;
  List<dynamic> get drivings => _drivings;
  List<dynamic> get attendances => _attendances;
  List<Ticket> get tickets => _tickets;
  List<dynamic> get signCategories => _signCategories;
  List<dynamic> get roadLines => _roadLines;
  Map<String, dynamic> get stats => _stats;
  int get selectedTabIndex => _selectedTabIndex;

  void setTabIndex(int index) {
    _selectedTabIndex = index;
    notifyListeners();
  }

  Future<void> loadAllData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final results = await Future.wait([
        _authService.fetchDashboard(),
        _quizService.fetchTickets(),
        _quizService.fetchSigns(),
        _quizService.fetchStats(),
      ]);

      final dashRes = results[0] as Map<String, dynamic>;
      if (dashRes['success'] == true) {
        _student = dashRes['student'];
        _contract = dashRes['contract'];
        _group = dashRes['group'];
        _topics = dashRes['topics'] ?? [];
        _drivings = dashRes['drivings'] ?? [];
        _attendances = dashRes['attendances'] ?? [];
      }

      _tickets = results[1] as List<Ticket>;

      final signsRes = results[2] as Map<String, dynamic>;
      _signCategories = signsRes['categories'] ?? [];
      _roadLines = signsRes['road_lines'] ?? [];

      _stats = results[3] as Map<String, dynamic>;
    } catch (e) {
      debugPrint('DashboardProvider loadAllData error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
