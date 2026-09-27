import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/quiz_provider.dart';
import '../../utils/localization.dart';
import '../quiz/desktop_quiz_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().loadAllData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final dash = context.watch<DashboardProvider>();
    final quiz = context.watch<QuizProvider>();
    final lang = auth.currentLanguage;

    // If quiz is currently active, show DesktopQuizScreen
    if (quiz.mode != QuizMode.none) {
      return const DesktopQuizScreen();
    }

    if (dash.isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.bgDark,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    final student = dash.student;
    final contract = dash.contract;

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: Row(
        children: [
          // Left Navigation Sidebar
          _buildSidebar(context, auth, dash, lang, student),

          // Main Content View
          Expanded(
            child: Column(
              children: [
                // Top Dashboard Header
                _buildHeader(context, auth, dash, lang, student, contract),

                // Selected Tab Body
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: _buildTabContent(context, dash, quiz, lang),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar(
    BuildContext context,
    AuthProvider auth,
    DashboardProvider dash,
    String lang,
    dynamic student,
  ) {
    return Container(
      width: 250,
      decoration: const BoxDecoration(
        color: AppColors.cardDark,
        border: Border(right: BorderSide(color: AppColors.borderDark)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // App Brand Logo
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.drive_eta_rounded, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AutoPrime',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    Text(
                      'LMS Desktop',
                      style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(color: AppColors.borderDark, height: 1),
          const SizedBox(height: 12),

          // Menu Items
          _buildMenuItem(dash, 0, Icons.dashboard_rounded, AppStrings.tr('tab_overview', lang)),
          _buildMenuItem(dash, 1, Icons.layers_rounded, AppStrings.tr('tab_tickets', lang)),
          _buildMenuItem(dash, 2, Icons.play_lesson_rounded, AppStrings.tr('tab_lms', lang)),
          _buildMenuItem(dash, 3, Icons.directions_car_filled_rounded, AppStrings.tr('tab_drivings', lang)),
          _buildMenuItem(dash, 4, Icons.traffic_rounded, AppStrings.tr('tab_signs', lang)),

          const Spacer(),
          const Divider(color: AppColors.borderDark, height: 1),

          // Logout button
          ListTile(
            onTap: () => auth.logout(),
            leading: const Icon(Icons.logout_rounded, color: AppColors.error, size: 20),
            title: Text(
              AppStrings.tr('logout', lang),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.error),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _buildMenuItem(DashboardProvider dash, int index, IconData icon, String title) {
    final isSelected = dash.selectedTabIndex == index;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      child: ListTile(
        onTap: () => dash.setTabIndex(index),
        selected: isSelected,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        tileColor: Colors.transparent,
        selectedTileColor: AppColors.primary.withOpacity(0.15),
        leading: Icon(icon, color: isSelected ? AppColors.primary : Colors.white60, size: 20),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? AppColors.primary : Colors.white70,
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(
    BuildContext context,
    AuthProvider auth,
    DashboardProvider dash,
    String lang,
    dynamic student,
    dynamic contract,
  ) {
    return Container(
      height: 70,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: const BoxDecoration(
        color: AppColors.cardDark,
        border: Border(bottom: BorderSide(color: AppColors.borderDark)),
      ),
      child: Row(
        children: [
          // Student Name & Group
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                student?.fullName ?? 'O\'quvchi',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              Text(
                student?.group?.name != null
                    ? '${student.group.name} (${student.group.category})'
                    : 'AutoPrime LMS',
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
          ),

          const SizedBox(width: 24),

          // Payment Status Badge
          if (contract != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.success.withOpacity(0.3)),
              ),
              child: Text(
                'To\'lov: ${contract.paymentPercentage}%',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.success),
              ),
            ),

          const Spacer(),

          // Language Switcher
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.bgDark,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: ['uz', 'ru', 'krill', 'en'].map((l) {
                final isSel = lang == l;
                return InkWell(
                  onTap: () => auth.changeLanguage(l),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSel ? AppColors.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      l == 'krill' ? 'Ўз' : l.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isSel ? Colors.white : Colors.white54,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabContent(
    BuildContext context,
    DashboardProvider dash,
    QuizProvider quiz,
    String lang,
  ) {
    switch (dash.selectedTabIndex) {
      case 1:
        return _buildTicketsGrid(dash, quiz, lang);
      case 2:
        return _buildLmsTab(dash, lang);
      case 3:
        return _buildDrivingsTab(dash, lang);
      case 4:
        return _buildSignsTab(dash, lang);
      default:
        return _buildOverviewTab(context, dash, quiz, lang);
    }
  }

  Widget _buildOverviewTab(
    BuildContext context,
    DashboardProvider dash,
    QuizProvider quiz,
    String lang,
  ) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Banner for Internal Mock Exam
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF4F46E5), Color(0xFF2563EB)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.bolt_rounded, color: Colors.amber, size: 20),
                        const SizedBox(width: 6),
                        Text(
                          AppStrings.tr('start_mock_exam', lang),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      AppStrings.tr('mock_exam_desc', lang),
                      style: const TextStyle(fontSize: 13, color: Colors.white70),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () => quiz.startMockExam(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF4F46E5),
                    padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text(
                    'Imtihonni Boshlash',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Quick 130 Tickets Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '130 ta Biletlar (${dash.tickets.length})',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              TextButton(
                onPressed: () => dash.setTabIndex(1),
                child: const Text('Barchasini ko\'rish →'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildTicketsGrid(dash, quiz, lang, limit: 10),
        ],
      ),
    );
  }

  Widget _buildTicketsGrid(DashboardProvider dash, QuizProvider quiz, String lang, {int? limit}) {
    final tickets = limit != null ? dash.tickets.take(limit).toList() : dash.tickets;

    return GridView.builder(
      shrinkWrap: limit != null,
      physics: limit != null ? const NeverScrollableScrollPhysics() : const BouncingScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 5,
        mainAxisSpacing: 14,
        crossAxisSpacing: 14,
        childAspectRatio: 1.4,
      ),
      itemCount: tickets.length,
      itemBuilder: (context, idx) {
        final t = tickets[idx];
        return InkWell(
          onTap: () => quiz.startTicketQuiz(t),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardDark,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderDark),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      t.getTitle(lang),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: AppColors.primary, size: 20),
                  ],
                ),
                Text(
                  '${t.questionsCount} ta savol',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildLmsTab(DashboardProvider dash, String lang) {
    if (dash.topics.isEmpty) {
      return const Center(
        child: Text('Hozircha dars materiallari mavjud emas.', style: TextStyle(color: AppColors.textMuted)),
      );
    }

    return ListView.separated(
      itemCount: dash.topics.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, idx) {
        final topic = dash.topics[idx];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderDark),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.play_circle_fill_rounded, color: AppColors.primary),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      topic['title'] ?? 'Dars mavzusi',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    if (topic['description'] != null)
                      Text(
                        topic['description'],
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDrivingsTab(DashboardProvider dash, String lang) {
    if (dash.drivings.isEmpty) {
      return const Center(
        child: Text('Rejalashtirilgan amaliy mashg\'ulotlar mavjud emas.', style: TextStyle(color: AppColors.textMuted)),
      );
    }

    return ListView.separated(
      itemCount: dash.drivings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, idx) {
        final d = dash.drivings[idx];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderDark),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    d['start_time'] ?? '',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  Text(
                    'Instruktor: ${d['instructor']?['name'] ?? 'Tayinlanmagan'}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: d['status'] == 'completed' ? AppColors.success.withOpacity(0.15) : AppColors.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  d['status'] ?? 'rejalashtirilgan',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: d['status'] == 'completed' ? AppColors.success : AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSignsTab(DashboardProvider dash, String lang) {
    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 6,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.9,
      ),
      itemCount: dash.roadLines.length,
      itemBuilder: (context, idx) {
        final sign = dash.roadLines[idx];
        final imgUrl = ApiConstants.formatImageUrl(sign['image_url']);

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderDark),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (imgUrl.isNotEmpty)
                Expanded(
                  child: CachedNetworkImage(
                    imageUrl: imgUrl,
                    fit: BoxFit.contain,
                  ),
                ),
              const SizedBox(height: 6),
              Text(
                sign['name_uz'] ?? '',
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white70),
              ),
            ],
          ),
        );
      },
    );
  }
}
