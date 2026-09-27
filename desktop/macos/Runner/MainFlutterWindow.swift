import Cocoa
import FlutterMacOS

class MainFlutterWindow: NSWindow {
  override func awakeFromNib() {
    let flutterViewController = FlutterViewController()
    self.contentViewController = flutterViewController
    var windowFrame = self.frame
    windowFrame.size = CGSize(width: 1280, height: 800)
    self.setFrame(windowFrame, display: true)
    self.minSize = CGSize(width: 1024, height: 700)
    self.center()

    RegisterGeneratedPlugins(registry: flutterViewController)

    super.awakeFromNib()
  }
}
