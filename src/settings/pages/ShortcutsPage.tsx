import { Card } from "../../components/ui/card";
import { useT } from "../../core/i18n";
import { macAppearanceEnabled } from "../../core/plugins/appearancePlugin";
import { useInstalledPlugins } from "../../core/plugins/registry";
import { useAllModules } from "../../modules";
import { Title } from "../components/Heading";
import { ShortcutRow } from "../components/ShortcutRow";

export function ShortcutsPage({ values }: { values: Record<string, unknown> }) {
	const t = useT();
	const modules = useAllModules();
	const macCompact = macAppearanceEnabled(useInstalledPlugins());
	const actionNames = Object.fromEntries(
		modules.map((module) => [module.shortcut ?? `module:${module.id}`, t(module.title)]),
	);
	actionNames.visibilityToggle = t("shortcuts.visibilityToggle");
	if (macCompact) actionNames.macCompactToggle = t("shortcuts.macCompactToggle");

	return (
		<>
			<Title>{t("shortcuts.title")}</Title>
			<Card>
				<ShortcutRow
					id="visibilityToggle"
					values={values}
					actionLabel={t("shortcuts.visibilityToggle")}
					actionNames={actionNames}
				/>
				{modules.map((module) => (
					<ShortcutRow
						key={module.id}
						id={module.shortcut ?? `module:${module.id}`}
						values={values}
						actionLabel={t(module.title)}
						actionNames={actionNames}
					/>
				))}
				{macCompact && (
					<ShortcutRow
						id="macCompactToggle"
						values={values}
						actionLabel={t("shortcuts.macCompactToggle")}
						actionNames={actionNames}
					/>
				)}
			</Card>
		</>
	);
}
