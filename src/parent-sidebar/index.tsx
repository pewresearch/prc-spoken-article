/**
 * WordPress Dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';

/**
 * Internal Dependencies
 */
import ParentSidebarPanel from './parent-sidebar-panel';

const PLUGIN_NAME = 'prc-spoken-article';

const headphonesIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24"
		height="24"
	>
		<path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
	</svg>
);

function SpokenArticleParentSidebar() {
	const { postParent } = useSelect((select) => {
		const editor = select(editorStore) as {
			getEditedPostAttribute: (attr: string) => unknown;
		};
		return {
			postParent:
				(editor.getEditedPostAttribute('parent') as number) ?? 0,
		};
	}, []);

	if (postParent > 0) {
		return null;
	}

	return (
		<>
			<PluginSidebarMoreMenuItem
				target={PLUGIN_NAME}
				icon={headphonesIcon}
			>
				{__('Spoken Article', 'prc-spoken-article')}
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name={PLUGIN_NAME}
				title={__('Spoken Article', 'prc-spoken-article')}
				icon={headphonesIcon}
			>
				<ParentSidebarPanel />
			</PluginSidebar>
		</>
	);
}

registerPlugin(PLUGIN_NAME, {
	render: SpokenArticleParentSidebar,
});
