import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../models/version_info.dart';
import '../services/update_service.dart';
import '../utils/localization.dart';

class UpdateProvider extends ChangeNotifier {
  final UpdateService _updateService = UpdateService();

  VersionInfo? _availableUpdate;
  bool _isChecking = false;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String _downloadSpeedText = '';
  String? _downloadError;

  VersionInfo? get availableUpdate => _availableUpdate;
  bool get hasUpdate => _availableUpdate != null;
  bool get isChecking => _isChecking;
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

  Future<void> checkForUpdatesManual(BuildContext context, String lang) async {
    if (_isChecking || _isDownloading) return;

    _isChecking = true;
    notifyListeners();

    try {
      final update = await _updateService.checkForUpdate();
      _isChecking = false;

      if (update != null) {
        _availableUpdate = update;
        notifyListeners();
      } else {
        notifyListeners();
        if (context.mounted) {
          ScaffoldMessenger.of(context).hideCurrentSnackBar();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppColors.cardDark,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: const BorderSide(color: AppColors.success),
              ),
              content: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 20),
                  const SizedBox(width: 10),
                  Text(
                    AppStrings.tr('latest_version', lang),
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (_) {
      _isChecking = false;
      notifyListeners();
      if (context.mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.cardDark,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
              side: const BorderSide(color: AppColors.error),
            ),
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                const SizedBox(width: 10),
                Text(
                  AppStrings.tr('update_error', lang),
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            duration: const Duration(seconds: 3),
          ),
        );
      }
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
