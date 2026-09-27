import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../constants/api_constants.dart';
import '../../constants/app_colors.dart';
import '../../models/question.dart';
import '../../providers/quiz_provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/localization.dart';

class DesktopQuizScreen extends StatefulWidget {
  const DesktopQuizScreen({super.key});

  @override
  State<DesktopQuizScreen> createState() => _DesktopQuizScreenState();
}

class _DesktopQuizScreenState extends State<DesktopQuizScreen> {
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  void _handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return;

    final quiz = context.read<QuizProvider>();
    final key = event.logicalKey;

    if (quiz.showExplanationDialog) {
      if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.space) {
        quiz.closeExplanation();
        quiz.nextQuestion();
      }
      return;
    }

    // F1 - F4 keys
    if (key == LogicalKeyboardKey.f1 || key == LogicalKeyboardKey.digit1 || key == LogicalKeyboardKey.numpad1 || key == LogicalKeyboardKey.keyA) {
      quiz.selectAnswerByIndex(0);
    } else if (key == LogicalKeyboardKey.f2 || key == LogicalKeyboardKey.digit2 || key == LogicalKeyboardKey.numpad2 || key == LogicalKeyboardKey.keyB) {
      quiz.selectAnswerByIndex(1);
    } else if (key == LogicalKeyboardKey.f3 || key == LogicalKeyboardKey.digit3 || key == LogicalKeyboardKey.numpad3 || key == LogicalKeyboardKey.keyC) {
      quiz.selectAnswerByIndex(2);
    } else if (key == LogicalKeyboardKey.f4 || key == LogicalKeyboardKey.digit4 || key == LogicalKeyboardKey.numpad4 || key == LogicalKeyboardKey.keyD) {
      quiz.selectAnswerByIndex(3);
    } else if (key == LogicalKeyboardKey.arrowRight || key == LogicalKeyboardKey.enter) {
      quiz.nextQuestion();
    } else if (key == LogicalKeyboardKey.arrowLeft) {
      quiz.prevQuestion();
    }
  }

  @override
  Widget build(BuildContext context) {
    final quiz = context.watch<QuizProvider>();
    final auth = context.watch<AuthProvider>();
    final lang = auth.currentLanguage;

    final currentQ = quiz.currentQuestion;
    if (currentQ == null) {
      return const Scaffold(
        backgroundColor: AppColors.bgDark,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    final totalQuestions = quiz.questions.length;
    final mins = (quiz.timeLeftSeconds ~/ 60).toString().padLeft(2, '0');
    final secs = (quiz.timeLeftSeconds % 60).toString().padLeft(2, '0');

    return KeyboardListener(
      focusNode: _focusNode,
      onKeyEvent: _handleKeyEvent,
      child: Scaffold(
        backgroundColor: AppColors.bgDark,
        body: Stack(
          children: [
            Column(
              children: [
                // Top Header Bar
                _buildTopBar(context, quiz, auth, lang, mins, secs, totalQuestions),

                // Main 2-Column Quiz Area
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Question Title Card
                        _buildQuestionTitleCard(currentQ, quiz, lang),
                        const SizedBox(height: 12),

                        // 2-Column Grid (Left: Image, Right: F1-F4 answers)
                        Expanded(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Left: Image / Diagram
                              Expanded(
                                flex: 5,
                                child: _buildImageCard(currentQ),
                              ),
                              const SizedBox(width: 16),

                              // Right: Answer Options
                              Expanded(
                                flex: 6,
                                child: _buildAnswersList(currentQ, quiz, lang),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Bottom Ribbon Navigation & Finish Button
                _buildBottomBar(context, quiz, lang, totalQuestions),
              ],
            ),

            // Explanation Modal Dialog
            if (quiz.showExplanationDialog)
              _buildExplanationOverlay(context, quiz, currentQ, lang),

            // Quiz Result Overlay
            if (quiz.isQuizFinished)
              _buildResultOverlay(context, quiz, lang),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(
    BuildContext context,
    QuizProvider quiz,
    AuthProvider auth,
    String lang,
    String mins,
    String secs,
    int totalQuestions,
  ) {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: const BoxDecoration(
        color: AppColors.cardDark,
        border: Border(bottom: BorderSide(color: AppColors.borderDark)),
      ),
      child: Row(
        children: [
          // Exit button
          IconButton(
            onPressed: () => _confirmExit(context, quiz),
            icon: const Icon(Icons.arrow_back_rounded, color: Colors.white70),
            tooltip: 'Chiqish',
          ),
          const SizedBox(width: 8),

          // Title
          Text(
            quiz.mode == QuizMode.exam
                ? AppStrings.tr('start_mock_exam', lang)
                : quiz.activeTicket?.getTitle(lang) ?? 'Bilet',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 16),

          // Timer
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: quiz.timeLeftSeconds < 180 ? AppColors.error.withOpacity(0.15) : AppColors.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: quiz.timeLeftSeconds < 180 ? AppColors.error : AppColors.primary,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.timer_outlined,
                  size: 16,
                  color: quiz.timeLeftSeconds < 180 ? AppColors.error : AppColors.primary,
                ),
                const SizedBox(width: 6),
                Text(
                  '$mins:$secs',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: quiz.timeLeftSeconds < 180 ? AppColors.error : AppColors.primary,
                  ),
                ),
              ],
            ),
          ),

          const Spacer(),

          // Explanation Switch
          Row(
            children: [
              Text(
                AppStrings.tr('explanation', lang),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70),
              ),
              const SizedBox(width: 6),
              Switch(
                value: quiz.isExplanationEnabled,
                onChanged: (_) => quiz.toggleExplanationEnabled(),
                activeColor: AppColors.primary,
              ),
            ],
          ),
          const SizedBox(width: 16),

          // Font size controls
          Row(
            children: [
              IconButton(
                onPressed: () => quiz.changeFontSize(-1),
                icon: const Icon(Icons.text_decrease_rounded, size: 18, color: Colors.white70),
                tooltip: 'Shriftni kichraytirish',
              ),
              Text(
                quiz.fontSize.toInt().toString(),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white70),
              ),
              IconButton(
                onPressed: () => quiz.changeFontSize(1),
                icon: const Icon(Icons.text_increase_rounded, size: 18, color: Colors.white70),
                tooltip: 'Shriftni kattalashtirish',
              ),
            ],
          ),
          const SizedBox(width: 16),

          // Quick Lang
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: AppColors.bgDark,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: ['uz', 'ru', 'krill', 'en'].map((l) {
                final isSel = lang == l;
                return InkWell(
                  onTap: () => auth.changeLanguage(l),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isSel ? AppColors.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      l == 'krill' ? 'Ўз' : l.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
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

  Widget _buildQuestionTitleCard(Question currentQ, QuizProvider quiz, String lang) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDark),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${AppStrings.tr('question', lang)} ${quiz.currentIndex + 1} / ${quiz.questions.length}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  currentQ.getQuestionLocalized(lang),
                  style: TextStyle(
                    fontSize: quiz.fontSize + 1,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => quiz.openExplanation(),
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.primary),
            tooltip: AppStrings.tr('explanation', lang),
          ),
        ],
      ),
    );
  }

  Widget _buildImageCard(Question currentQ) {
    final imageUrl = ApiConstants.formatImageUrl(currentQ.imageUrl);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardDark.withOpacity(0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDark),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: imageUrl.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: imageUrl,
                fit: BoxFit.contain,
                placeholder: (_, __) => const Center(
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
                errorWidget: (_, __, ___) => const Center(
                  child: Icon(Icons.image_not_supported_rounded, color: Colors.white30, size: 48),
                ),
              )
            : const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.traffic_rounded, color: Colors.white24, size: 54),
                    SizedBox(height: 8),
                    Text(
                      'Ushbu savolda rasm mavjud emas',
                      style: TextStyle(color: Colors.white30, fontSize: 13),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildAnswersList(Question currentQ, QuizProvider quiz, String lang) {
    final selectedAnsId = quiz.selectedAnswers[currentQ.id];
    final isAnswered = selectedAnsId != null;

    return ListView.separated(
      itemCount: currentQ.answers.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, idx) {
        final ans = currentQ.answers[idx];
        final isSelected = selectedAnsId == ans.id;
        final isCorrect = ans.isCorrect;

        Color borderColor = AppColors.borderDark;
        Color bgColor = AppColors.cardDark;
        Color fBadgeColor = Colors.white24;

        if (isAnswered) {
          if (isCorrect) {
            borderColor = AppColors.success;
            bgColor = AppColors.success.withOpacity(0.15);
            fBadgeColor = AppColors.success;
          } else if (isSelected && !isCorrect) {
            borderColor = AppColors.error;
            bgColor = AppColors.error.withOpacity(0.15);
            fBadgeColor = AppColors.error;
          }
        } else if (isSelected) {
          borderColor = AppColors.primary;
          bgColor = AppColors.primary.withOpacity(0.15);
          fBadgeColor = AppColors.primary;
        }

        return InkWell(
          onTap: () => quiz.selectAnswer(currentQ.id, ans.id),
          borderRadius: BorderRadius.circular(14),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: borderColor, width: isSelected || (isAnswered && isCorrect) ? 2 : 1),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: fBadgeColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    'F${idx + 1}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: fBadgeColor,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    ans.getLocalized(lang),
                    style: TextStyle(
                      fontSize: quiz.fontSize,
                      fontWeight: FontWeight.w500,
                      color: Colors.white,
                      height: 1.3,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBottomBar(BuildContext context, QuizProvider quiz, String lang, int total) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: const BoxDecoration(
        color: AppColors.cardDark,
        border: Border(top: BorderSide(color: AppColors.borderDark)),
      ),
      child: Row(
        children: [
          // Ribbon Numbers
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(total, (idx) {
                  final q = quiz.questions[idx];
                  final selectedId = quiz.selectedAnswers[q.id];
                  final isAnswered = selectedId != null;
                  final isCurrent = quiz.currentIndex == idx;

                  Color btnColor = AppColors.bgDark;
                  Color textColor = Colors.white70;

                  if (isAnswered) {
                    final correctAns = q.answers.firstWhere((a) => a.id == selectedId, orElse: () => q.answers.first);
                    btnColor = correctAns.isCorrect ? AppColors.success : AppColors.error;
                    textColor = Colors.white;
                  } else if (isCurrent) {
                    btnColor = AppColors.primary;
                    textColor = Colors.white;
                  }

                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: InkWell(
                      onTap: () => quiz.goToQuestion(idx),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: btnColor,
                          borderRadius: BorderRadius.circular(8),
                          border: isCurrent ? Border.all(color: Colors.white, width: 2) : null,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${idx + 1}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: textColor,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
          const SizedBox(width: 20),

          // Finish Button
          ElevatedButton(
            onPressed: () => _confirmFinish(context, quiz),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle_rounded, size: 18),
                const SizedBox(width: 8),
                Text(
                  AppStrings.tr('finish_test', lang),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExplanationOverlay(
    BuildContext context,
    QuizProvider quiz,
    Question currentQ,
    String lang,
  ) {
    return Container(
      color: Colors.black.withOpacity(0.65),
      alignment: Alignment.center,
      child: Container(
        width: 520,
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.primary),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.lightbulb_rounded, color: AppColors.warning, size: 24),
                    const SizedBox(width: 10),
                    Text(
                      AppStrings.tr('explanation', lang),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => quiz.closeExplanation(),
                  icon: const Icon(Icons.close_rounded, color: Colors.white54),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              constraints: const BoxConstraints(maxHeight: 220),
              decoration: BoxDecoration(
                color: AppColors.bgDark,
                borderRadius: BorderRadius.circular(12),
              ),
              child: SingleChildScrollView(
                child: Text(
                  currentQ.getDescriptionLocalized(lang),
                  style: TextStyle(
                    fontSize: quiz.fontSize,
                    color: Colors.white70,
                    height: 1.5,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                quiz.closeExplanation();
                quiz.nextQuestion();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    AppStrings.tr('next_question', lang),
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(width: 6),
                  const Icon(Icons.arrow_forward_rounded, size: 16, color: Colors.white),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultOverlay(BuildContext context, QuizProvider quiz, String lang) {
    final res = quiz.quizResult!;
    final isPassed = res['is_passed'] == true;
    final correct = res['correct_answers'] ?? 0;
    final total = res['total_questions'] ?? 20;
    final percent = res['score_percentage'] ?? 0;

    return Container(
      color: Colors.black.withOpacity(0.8),
      alignment: Alignment.center,
      child: Container(
        width: 480,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: isPassed ? AppColors.success : AppColors.error, width: 2),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isPassed ? Icons.emoji_events_rounded : Icons.cancel_rounded,
              color: isPassed ? AppColors.success : AppColors.error,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              isPassed ? 'Tabriklaymiz, Imtihondan O\'tdingiz!' : 'Afsuski, O\'ta Olmadingiz',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 10),
            Text(
              '$correct / $total ta to\'g\'ri javob ($percent%)',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isPassed ? AppColors.success : AppColors.error,
              ),
            ),
            const SizedBox(height: 28),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => quiz.exitQuiz(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: AppColors.borderDark),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Bosh Menyu'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      if (quiz.activeTicket != null) {
                        quiz.startTicketQuiz(quiz.activeTicket!);
                      } else {
                        quiz.startMockExam();
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Qayta Topshirish'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _confirmExit(BuildContext context, QuizProvider quiz) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.cardDark,
        title: const Text('Testdan chiqmoqchimisiz?', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Hozirgi urinishingiz bekor qilinadi.',
          style: TextStyle(color: AppColors.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              quiz.exitQuiz();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Chiqish', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmFinish(BuildContext context, QuizProvider quiz) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.cardDark,
        title: const Text('Testni yakunlaysizmi?', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Barcha javoblaringiz tekshiriladi va natija saqlanadi.',
          style: TextStyle(color: AppColors.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Davom etish'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              quiz.submitQuiz();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
            child: const Text('Yakunlash', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
