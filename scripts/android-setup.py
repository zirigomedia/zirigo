from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

root = Path("android/app/src/main/res")
source = Image.open("assets/zirigo-logo.png").convert("RGBA")

# Generate correctly sized launcher icons for every Android density.
sizes = {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}
for density, size in sizes.items():
    folder = root / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", (size, size), (8,8,8,255))
    logo = ImageOps.contain(source, (int(size*.78), int(size*.78)))
    canvas.alpha_composite(logo, ((size-logo.width)//2, (size-logo.height)//2))
    canvas.save(folder / "ic_launcher.png")
    canvas.save(folder / "ic_launcher_round.png")

# Adaptive launcher icon for Android 8+.
folder = root / "mipmap-anydpi-v26"
folder.mkdir(parents=True, exist_ok=True)
foreground = Image.new("RGBA", (432,432), (0,0,0,0))
logo = ImageOps.contain(source, (300,300))
foreground.alpha_composite(logo, ((432-logo.width)//2, (432-logo.height)//2))
foreground.save(root / "mipmap-xxxhdpi" / "ic_launcher_foreground.png")
# Also store the foreground in the resource root so all density variants resolve.
for density in sizes:
    d = root / f"mipmap-{density}"
    d.mkdir(parents=True, exist_ok=True)
    fg = Image.new("RGBA", (432,432), (0,0,0,0))
    fg.alpha_composite(logo, ((432-logo.width)//2, (432-logo.height)//2))
    fg.save(d / "ic_launcher_foreground.png")

(folder / "ic_launcher.xml").write_text(
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '  <background android:drawable="@color/zirigo_launcher_background"/>\n'
    '  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
    '</adaptive-icon>\n'
)
colors = root / "values"
colors.mkdir(parents=True, exist_ok=True)
(colors / "zirigo_launcher_colors.xml").write_text(
    '<resources><color name="zirigo_launcher_background">#080808</color></resources>\n'
)

# Keep Android WebView at normal text scale and allow device rotation.
manifest = Path("android/app/src/main/AndroidManifest.xml")
xml = manifest.read_text()
# Android activity is allowed to follow device rotation.
xml = xml.replace('<application', '<application android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round"', 1)
xml = xml.replace('<activity', '<activity android:screenOrientation="sensor"', 1)
manifest.write_text(xml)

main = Path("android/app/src/main/java/com/zirigomedia/app/MainActivity.java")
main.parent.mkdir(parents=True, exist_ok=True)
main.write_text("""package com.zirigomedia.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().getSettings().setTextZoom(100);
        getBridge().getWebView().getSettings().setSupportZoom(false);
        getBridge().getWebView().getSettings().setBuiltInZoomControls(false);
        getBridge().getWebView().getSettings().setDisplayZoomControls(false);
    }
}
""")
