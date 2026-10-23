import * as Burnt from "burnt";

export default function BurntToastifY({ title, message, preset, type }) {
    // Logic: If you want custom colors/icons, you MUST use the "custom" preset
    // Otherwise, the library uses native defaults and ignores your 'icon' object.
    const isCustom = preset === "error" || preset === "done";

    Burnt.toast({
        title: title,
        message: message,
        // Change "error" to "custom" to unlock color/icon customization
        preset: isCustom ? "custom" : preset,
        from: "top",
        duration: 3,
        haptic: type, // "success", "warning", "error", or "none"

        // This icon block only works if preset is "custom" or "none"
        icon: {
            ios: {
                // Use "exclamationmark.triangle" or "xmark.circle" for error looks
                name: preset === "error" ? "xmark.circle.fill" : "checkmark.circle.fill",
                color: preset === "error" ? "#FF3B30" : "#34C759", // Red for error, Green for success
            },
        },

        layout: {
            iconSize: {
                height: 50,
                width: 50,
            },
        },
    });
}