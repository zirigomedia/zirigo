from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import xml.etree.ElementTree as ET
ET.register_namespace("android", "http://schemas.android.com/apk/res/android")

root = Path("android/app/src/main/res")
icon_source_path = Path("assets/zirigo-logo.png")
source = Image.open(icon_source_path if icon_source_path.exists() else "assets/icon-512.png").convert("RGBA")

# Remove transparent padding inside the supplied PNG so the visible logo fills
# the icon artwork area, while preserving every visible part of the mark.
def trim_transparent(image):
    alpha = image.getchannel("A")
    if alpha.getextrema()[0] < 255:
        bounds = alpha.getbbox()
        if bounds:
            image = image.crop(bounds)
    return image

source = trim_transparent(source)

# Generate transparent launcher icons with generous breathing room around the ZIRIGO mark.
sizes = {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}
for density, size in sizes.items():
    folder = root / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", (size, size), (0,0,0,0))
    logo = ImageOps.contain(source, (int(size*.68), int(size*.58)), method=Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, ((size-logo.width)//2, (size-logo.height)//2))
    canvas.save(folder / "ic_launcher.png")
    canvas.save(folder / "ic_launcher_round.png")

# Use the density-specific PNG launcher artwork directly.
# Android's adaptive-icon background layer is composited by some launchers as black
# when transparent. A legacy RGBA PNG lets the transparent pixels stay transparent,
# like PixelLab's mark-only icon. Do not generate an adaptive-icon XML/background.
adaptive_dir = root / "mipmap-anydpi-v26"
adaptive_xml = adaptive_dir / "ic_launcher.xml"
if adaptive_xml.exists():
    adaptive_xml.unlink()
launcher_colors = root / "values" / "zirigo_launcher_colors.xml"
if launcher_colors.exists():
    launcher_colors.unlink()
for density in sizes:
    foreground_file = root / f"mipmap-{density}" / "ic_launcher_foreground.png"
    if foreground_file.exists():
        foreground_file.unlink()

# Native Android launch screen: use the supplied ZIRIGO logo with safe padding.
# Android 12 applies a system mask to splash artwork, so keep the mark inside
# the central safe area to prevent the edges from being clipped.
drawable = root / "drawable-nodpi"
drawable.mkdir(parents=True, exist_ok=True)
splash_source_path = Path("assets/zirigo-logo.png")
splash_source = Image.open(splash_source_path).convert("RGBA") if splash_source_path.exists() else source.copy()
splash_canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
splash_mark = ImageOps.contain(splash_source, (420, 420), method=Image.Resampling.LANCZOS)
splash_canvas.alpha_composite(splash_mark, ((512 - splash_mark.width) // 2, (512 - splash_mark.height) // 2))
splash_canvas.save(drawable / "zirigo_splash_logo.png")

values = root / "values"
values.mkdir(parents=True, exist_ok=True)
(values / "zirigo_splash_colors.xml").write_text("""<resources>
  <color name="zirigo_splash_background">#080808</color>
</resources>
""")
styles_path = values / "styles.xml"
styles_tree = ET.parse(styles_path)
styles_root = styles_tree.getroot()
splash_style = styles_root.find("style[@name='AppTheme.Splash']")
if splash_style is None:
    splash_style = ET.SubElement(styles_root, "style", {"name": "AppTheme.Splash", "parent": "AppTheme.NoActionBar"})
ET.SubElement(splash_style, "item", {"name": "android:windowBackground"}).text = "@color/zirigo_splash_background"
styles_tree.write(styles_path, encoding="utf-8", xml_declaration=True)
values_v31 = root / "values-v31"
values_v31.mkdir(parents=True, exist_ok=True)
(values_v31 / "styles.xml").write_text("""<resources>
  <style name="AppTheme.Splash" parent="AppTheme.NoActionBar">
    <item name="android:windowSplashScreenBackground">#080808</item>
    <item name="android:windowSplashScreenAnimatedIcon">@drawable/zirigo_splash_logo</item>
    <item name="android:windowSplashScreenAnimationDuration">500</item>
  </style>
</resources>
""")

# Configure the WebView viewport, audio autoplay, and a real native orientation bridge.
manifest = Path("android/app/src/main/AndroidManifest.xml")
tree = ET.parse(manifest)
manifest_root = tree.getroot()
android_ns = "{http://schemas.android.com/apk/res/android}"
application = manifest_root.find("application")
if application is None:
    raise RuntimeError("Android manifest has no application element")
application.set(android_ns + "icon", "@mipmap/ic_launcher")
application.set(android_ns + "roundIcon", "@mipmap/ic_launcher_round")
activity = application.find("activity")
if activity is None:
    raise RuntimeError("Android manifest has no activity element")
activity.set(android_ns + "screenOrientation", "unspecified")
activity.set(android_ns + "theme", "@style/AppTheme.Splash")
tree.write(manifest, encoding="utf-8", xml_declaration=True)

main = Path("android/app/src/main/java/com/zirigomedia/app/MainActivity.java")
main.parent.mkdir(parents=True, exist_ok=True)
main.write_text("""package com.zirigomedia.app;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.addJavascriptInterface(new ZirigoOrientation(), "ZirigoOrientation");
    }

    public class ZirigoOrientation {
        @JavascriptInterface
        public void lockLandscape() {
            runOnUiThread(() -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
        }

        @JavascriptInterface
        public void unlock() {
            runOnUiThread(() -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
        }
    }
}
""")
