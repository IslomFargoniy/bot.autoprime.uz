import 'question.dart';

class Ticket {
  final int id;
  final int ticketNumber;
  final String? titleUz;
  final String? titleRu;
  final String? titleKrill;
  final String? titleEn;
  final int questionsCount;
  final int attemptsCount;
  final List<Question>? questions;

  Ticket({
    required this.id,
    required this.ticketNumber,
    this.titleUz,
    this.titleRu,
    this.titleKrill,
    this.titleEn,
    this.questionsCount = 10,
    this.attemptsCount = 0,
    this.questions,
  });

  factory Ticket.fromJson(Map<String, dynamic> json) {
    List<Question>? qList;
    if (json['questions'] != null) {
      qList = (json['questions'] as List).map((q) => Question.fromJson(q)).toList();
    }

    return Ticket(
      id: json['id'] ?? 0,
      ticketNumber: json['ticket_number'] ?? 0,
      titleUz: json['title_uz'] ?? 'Bilet ${json['ticket_number']}',
      titleRu: json['title_ru'],
      titleKrill: json['title_krill'],
      titleEn: json['title_en'],
      questionsCount: json['questions_count'] ?? 10,
      attemptsCount: json['attempts_count'] ?? 0,
      questions: qList,
    );
  }

  String getTitle(String lang) {
    if (lang == 'ru' && titleRu != null && titleRu!.isNotEmpty) return titleRu!;
    if (lang == 'krill' && titleKrill != null && titleKrill!.isNotEmpty) return titleKrill!;
    if (lang == 'en' && titleEn != null && titleEn!.isNotEmpty) return titleEn!;
    return titleUz ?? 'Bilet $ticketNumber';
  }
}
