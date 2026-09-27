import 'answer.dart';

class Question {
  final int id;
  final int ticketId;
  final int questionNumber;
  final String questionUz;
  final String? questionRu;
  final String? questionKrill;
  final String? questionEn;
  final String? descriptionUz;
  final String? descriptionRu;
  final String? descriptionKrill;
  final String? descriptionEn;
  final String? imageUrl;
  final List<Answer> answers;

  Question({
    required this.id,
    required this.ticketId,
    required this.questionNumber,
    required this.questionUz,
    this.questionRu,
    this.questionKrill,
    this.questionEn,
    this.descriptionUz,
    this.descriptionRu,
    this.descriptionKrill,
    this.descriptionEn,
    this.imageUrl,
    required this.answers,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    var rawAnswers = json['answers'] as List? ?? [];
    List<Answer> answerList = rawAnswers.map((a) => Answer.fromJson(a)).toList();

    return Question(
      id: json['id'] ?? 0,
      ticketId: json['ticket_id'] ?? 0,
      questionNumber: json['question_number'] ?? 1,
      questionUz: json['question_uz'] ?? json['question'] ?? '',
      questionRu: json['question_ru'],
      questionKrill: json['question_krill'],
      questionEn: json['question_en'],
      descriptionUz: json['description_uz'] ?? json['description'],
      descriptionRu: json['description_ru'],
      descriptionKrill: json['description_krill'],
      descriptionEn: json['description_en'],
      imageUrl: json['image_url'],
      answers: answerList,
    );
  }

  String getQuestionLocalized(String lang) {
    if (lang == 'ru' && questionRu != null && questionRu!.isNotEmpty) return questionRu!;
    if (lang == 'krill' && questionKrill != null && questionKrill!.isNotEmpty) return questionKrill!;
    if (lang == 'en' && questionEn != null && questionEn!.isNotEmpty) return questionEn!;
    return questionUz;
  }

  String getDescriptionLocalized(String lang) {
    if (lang == 'ru' && descriptionRu != null && descriptionRu!.isNotEmpty) return descriptionRu!;
    if (lang == 'krill' && descriptionKrill != null && descriptionKrill!.isNotEmpty) return descriptionKrill!;
    if (lang == 'en' && descriptionEn != null && descriptionEn!.isNotEmpty) return descriptionEn!;
    return descriptionUz ?? 'Ushbu savol uchun tavsif berilmagan.';
  }
}
