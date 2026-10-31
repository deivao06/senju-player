import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { ItemCategory } from '@senju/iptv';
import { Button } from './Button';
import type { CatalogFilter } from './catalogFilter';
import { colors } from './theme';
import {
  contentLabels,
  platformForGroup,
  platformSections,
  type CategoryGroups,
  type CatalogSelection,
} from './catalogNavigation';

type Row =
  | { id: string; kind: 'home' }
  | { id: string; kind: 'all'; type: ItemCategory }
  | { id: string; kind: 'divider' }
  | { id: string; kind: 'label'; title: string }
  | { id: string; kind: 'platform'; key: string; label: string }
  | { id: string; kind: 'child'; key: string; type: ItemCategory }
  | { id: string; kind: 'others' }
  | { id: string; kind: 'group'; group: string }
  | { id: string; kind: 'filter'; value: 'favorites' | 'recent' | 'new' };
type Props = {
  home: boolean;
  onHome: () => void;
  groups: CategoryGroups;
  category: ItemCategory;
  platform: string;
  group: string;
  filter: CatalogFilter;
  loading: boolean;
  onSelect: (type: ItemCategory, selection?: CatalogSelection) => void;
  onFilter: (value: CatalogFilter) => void;
};
export function CatalogMenu(props: Props) {
  const [expanded, setExpanded] = useState(() => new Set(props.platform ? [props.platform] : []));
  const [others, setOthers] = useState(!!props.group);
  const [listHeight, setListHeight] = useState(300);
  const platforms = useMemo(() => platformSections(props.groups), [props.groups]);
  const rows = useMemo(() => {
    const result: Row[] = [
      { id: 'home', kind: 'home' },
      ...(['CHANNEL', 'MOVIE', 'SERIES'] as const).map((type) => ({
        id: `all-${type}`,
        kind: 'all' as const,
        type,
      })),
    ];
    result.push(
      { id: 'new', kind: 'filter', value: 'new' },
      { id: 'personal-divider', kind: 'divider' },
      { id: 'favorites', kind: 'filter', value: 'favorites' },
      { id: 'recent', kind: 'filter', value: 'recent' },
      { id: 'platform-divider', kind: 'divider' },
      { id: 'platform-label', kind: 'label', title: 'Plataformas' },
    );
    for (const platform of platforms) {
      result.push({ id: platform.key, kind: 'platform', key: platform.key, label: platform.label });
      if (expanded.has(platform.key))
        for (const type of platform.types)
          result.push({ id: `${platform.key}-${type}`, kind: 'child', key: platform.key, type });
    }
    result.push({ id: 'others', kind: 'others' });
    if (others)
      for (const group of props.groups[props.category] || []) {
        if (!platformForGroup(group)) result.push({ id: `group-${group}`, kind: 'group', group });
      }
    return result;
  }, [platforms, expanded, others, props.groups, props.category]);
  const layouts = useMemo(() => {
    let offset = 0;
    return rows.map((row, index) => {
      const length = row.kind === 'divider' ? 20 : row.kind === 'label' ? 30 : 42;
      const layout = { index, length, offset };
      offset += length;
      return layout;
    });
  }, [rows]);
  const preferredId = props.home
    ? 'home'
    : props.filter === 'new'
      ? 'new'
      : props.platform
        ? `${props.platform}-${props.category}`
        : props.group
          ? `group-${props.group}`
          : props.filter !== 'all'
            ? props.filter
            : `all-${props.category}`;
  const initial = Math.max(
    0,
    rows.findIndex((row) => row.id === preferredId),
  );
  function toggle(key: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  return (
    <>
      <Text style={styles.eyebrow}>Biblioteca</Text>
      <View
        style={styles.list}
        onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
      >
        <FlatList
          style={{ height: listHeight }}
          data={rows}
          keyExtractor={(row) => row.id}
          initialNumToRender={16}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialScrollIndex={initial || undefined}
          getItemLayout={(_, index) => layouts[index]}
          renderItem={({ item: row }) => {
            if (row.kind === 'divider')
              return (
                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                </View>
              );
            if (row.kind === 'label') return <Text style={styles.groupLabel}>{row.title}</Text>;
            let title: string;
            let selected = false;
            let expandedState: boolean | undefined;
            let child = false;
            let action: () => void;
            switch (row.kind) {
              case 'home':
                title = 'Início';
                selected = props.home;
                action = props.onHome;
                break;
              case 'all':
                title = contentLabels[row.type];
                selected =
                  !props.home &&
                  row.type === props.category &&
                  !props.platform &&
                  !props.group &&
                  props.filter === 'all';
                action = () => props.onSelect(row.type);
                break;
              case 'platform':
                title = row.label;
                expandedState = expanded.has(row.key);
                action = () => toggle(row.key);
                break;
              case 'child':
                title = contentLabels[row.type];
                selected = !props.home && row.key === props.platform && row.type === props.category;
                child = true;
                action = () => props.onSelect(row.type, { platform: row.key });
                break;
              case 'others':
                title = 'Outras categorias';
                expandedState = others;
                action = () => setOthers((value) => !value);
                break;
              case 'group':
                title = row.group;
                child = true;
                selected = !props.home && props.group === row.group;
                action = () => props.onSelect(props.category, { group: row.group });
                break;
              case 'filter':
                title =
                  row.value === 'new'
                    ? 'Adicionados recentemente'
                    : row.value === 'favorites'
                      ? 'Favoritos'
                      : 'Histórico';
                selected = !props.home && props.filter === row.value;
                action = () => props.onFilter(row.value);
                break;
            }
            return (
              <Button
                small
                quiet
                title={title}
                selected={selected}
                expanded={expandedState}
                preferred={row.id === preferredId}
                disabled={
                  props.loading &&
                  (row.kind === 'all' ||
                    row.kind === 'child' ||
                    row.kind === 'group' ||
                    (row.kind === 'filter' && row.value === 'new'))
                }
                onPress={action}
                style={[styles.row, child && styles.child]}
              />
            );
          }}
        />
      </View>
    </>
  );
}
const styles = StyleSheet.create({
  eyebrow: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 12,
    marginBottom: 20,
  },
  groupLabel: { height: 30, paddingLeft: 14, color: colors.muted, fontSize: 11, fontWeight: '500' },
  list: { flex: 1 },
  row: {
    height: 40,
    minHeight: 40,
    paddingLeft: 18,
    paddingRight: 14,
    marginVertical: 1,
    marginHorizontal: 0,
  },
  child: { paddingLeft: 38 },
  dividerRow: { height: 20, justifyContent: 'center', paddingHorizontal: 14 },
  divider: { height: 1, backgroundColor: colors.stroke },
});
