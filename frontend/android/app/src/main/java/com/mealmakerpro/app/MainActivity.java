package com.mealmakerpro.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Render text at the sizes the stylesheet asks for, as iOS WebKit does, instead
        // of multiplying every px value by the system font-size setting. Samsung phones
        // often ship at 115%+, which wrapped the title and pushed layouts past their
        // breakpoints.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
