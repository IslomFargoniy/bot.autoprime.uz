import 'package:flutter/material.dart';
import '../models/version_info.dart';
import '../services/update_service.dart';

class UpdateProvider extends ChangeNotifier {
  final UpdateService _updateService = UpdateService();

  VersionInfo? _availableUpdate;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String _downloadSpeedText = '';
  String? _downloadError;

  VersionInfo? get availableUpdate => _availableUpdate;
  bool get hasUpdate => _availableUpdate != null;
  bool get isDownloading => _isDownloading;
  double get downloadProgress => _downloadProgress;
  String get downloadSpeedText => _downloadSpeedText;
  String? get downloadError => _downloadError;

  Future<void> checkForUpdates() async {
    final update = await _updateService.checkForUpdate();
    if (update != null) {
      _availableUpdate = update;
      notifyListeners();
    }
  }

  Future<void> startUpdate() async {
    if (_availableUpdate == null) return;

    _isDownloading = true;
    _downloadProgress = 0.0;
    _downloadError = null;
    notifyListeners();

    final success = await _updateService.downloadAndInstall(
      versionInfo: _availableUpdate!,
      onProgress: (progress, text) {
        _downloadProgress = progress;
        _downloadSpeedText = text;
        notifyListeners();
      },
    );

    if (!success) {
      _isDownloading = false;
      _downloadError = 'Yuklab olishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.';
      notifyListeners();
    }
  }

  void dismissUpdate() {
    if (_availableUpdate?.isMandatory != true) {
      _availableUpdate = null;
      notifyListeners();
    }
  }
}
