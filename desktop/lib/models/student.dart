class Student {
  final int id;
  final String fullName;
  final String phone;
  final String? photoUrl;
  final BranchInfo? branch;
  final GroupInfo? group;
  final ContractInfo? contract;

  Student({
    required this.id,
    required this.fullName,
    required this.phone,
    this.photoUrl,
    this.branch,
    this.group,
    this.contract,
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      id: json['id'] ?? 0,
      fullName: json['full_name'] ?? '',
      phone: json['phone'] ?? '',
      photoUrl: json['photo_url'],
      branch: json['branch'] != null ? BranchInfo.fromJson(json['branch']) : null,
      group: json['group'] != null ? GroupInfo.fromJson(json['group']) : null,
      contract: json['contract'] != null ? ContractInfo.fromJson(json['contract']) : null,
    );
  }
}

class BranchInfo {
  final int? id;
  final String name;

  BranchInfo({this.id, required this.name});

  factory BranchInfo.fromJson(Map<String, dynamic> json) {
    return BranchInfo(
      id: json['id'],
      name: json['name'] ?? '',
    );
  }
}

class GroupInfo {
  final int id;
  final String name;
  final String category;
  final String? startTime;
  final String? endTime;
  final String? room;
  final TeacherInfo? teacher;

  GroupInfo({
    required this.id,
    required this.name,
    required this.category,
    this.startTime,
    this.endTime,
    this.room,
    this.teacher,
  });

  factory GroupInfo.fromJson(Map<String, dynamic> json) {
    return GroupInfo(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      category: json['category'] ?? 'B',
      startTime: json['start_time'],
      endTime: json['end_time'],
      room: json['room'],
      teacher: json['teacher'] != null ? TeacherInfo.fromJson(json['teacher']) : null,
    );
  }
}

class TeacherInfo {
  final String name;
  final String? phone;

  TeacherInfo({required this.name, this.phone});

  factory TeacherInfo.fromJson(Map<String, dynamic> json) {
    return TeacherInfo(
      name: json['name'] ?? '',
      phone: json['phone'],
    );
  }
}

class ContractInfo {
  final int id;
  final String contractNumber;
  final double totalAmount;
  final double paidAmount;
  final double debtAmount;
  final double paymentPercentage;
  final String paymentBadgeColor;
  final bool hasTheory;
  final bool hasDriving;
  final bool hasLms;

  ContractInfo({
    required this.id,
    required this.contractNumber,
    required this.totalAmount,
    required this.paidAmount,
    required this.debtAmount,
    required this.paymentPercentage,
    required this.paymentBadgeColor,
    required this.hasTheory,
    required this.hasDriving,
    required this.hasLms,
  });

  factory ContractInfo.fromJson(Map<String, dynamic> json) {
    return ContractInfo(
      id: json['id'] ?? 0,
      contractNumber: json['contract_number'] ?? '',
      totalAmount: (json['total_amount'] ?? 0).toDouble(),
      paidAmount: (json['paid_amount'] ?? 0).toDouble(),
      debtAmount: (json['debt_amount'] ?? 0).toDouble(),
      paymentPercentage: (json['payment_percentage'] ?? 0).toDouble(),
      paymentBadgeColor: json['payment_badge_color'] ?? 'white',
      hasTheory: json['has_theory'] ?? true,
      hasDriving: json['has_driving'] ?? true,
      hasLms: json['has_lms'] ?? true,
    );
  }
}
