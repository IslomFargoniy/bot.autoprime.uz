class VersionInfo {
  final String version;
  final int buildNumber;
  final String releaseDate;
  final bool isMandatory;
  final String downloadUrlWindows;
  final String downloadUrlMacos;
  final double fileSizeMb;
  final String changelogUz;
  final String changelogRu;

  VersionInfo({
    required this.version,
    required this.buildNumber,
    required this.releaseDate,
    required this.isMandatory,
    required this.downloadUrlWindows,
    required this.downloadUrlMacos,
    required this.fileSizeMb,
    required this.changelogUz,
    required this.changelogRu,
  });

  factory VersionInfo.fromJson(Map<String, dynamic> json) {
    return VersionInfo(
      version: json['version'] ?? '1.0.0',
      buildNumber: json['build_number'] ?? 1,
      releaseDate: json['release_date'] ?? '',
      isMandatory: json['is_mandatory'] ?? false,
      downloadUrlWindows: json['download_url_windows'] ?? '',
      downloadUrlMacos: json['download_url_macos'] ?? '',
      fileSizeMb: (json['file_size_mb'] ?? 25.0).toDouble(),
      changelogUz: json['changelog_uz'] ?? '',
      changelogRu: json['changelog_ru'] ?? '',
    );
  }
}
