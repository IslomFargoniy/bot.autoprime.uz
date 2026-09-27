class Answer {
  final int id;
  final String answerUz;
  final String? answerRu;
  final String? answerKrill;
  final String? answerEn;
  final bool isCorrect;
  final int order;

  Answer({
    required this.id,
    required this.answerUz,
    this.answerRu,
    this.answerKrill,
    this.answerEn,
    required this.isCorrect,
    this.order = 0,
  });

  factory Answer.fromJson(Map<String, dynamic> json) {
    return Answer(
      id: json['id'] ?? 0,
      answerUz: json['answer_uz'] ?? json['answer'] ?? '',
      answerRu: json['answer_ru'],
      answerKrill: json['answer_krill'],
      answerEn: json['answer_en'],
      isCorrect: json['is_correct'] == true || json['is_correct'] == 1,
      order: json['order'] ?? 0,
    );
  }

  String getLocalized(String lang) {
    if (lang == 'ru' && answerRu != null && answerRu!.isNotEmpty) return answerRu!;
    if (lang == 'krill' && answerKrill != null && answerKrill!.isNotEmpty) return answerKrill!;
    if (lang == 'en' && answerEn != null && answerEn!.isNotEmpty) return answerEn!;
    return answerUz;
  }
}
