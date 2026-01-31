# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/components/CalendarModal.tsx')
text = path.read_text(encoding='utf-8')
old = """type Props = {
  unitId: string;
  ownerUid: string; // ���?��� �?�� ��?���?�>�?���?��'�?�?, �?�?�'���?�>�?��? �?�>�? �?�?�?�?��?�'��?�?�?�'��
  onClose: () => void;
  onCreated?: () => void;
};

export default function CalendarModal({ unitId, ownerUid, onClose, onCreated }: Props) {
"""
new = """type Props = {
  unitId: string;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CalendarModal({ unitId, onClose, onCreated }: Props) {
"""
if old not in text:
    raise SystemExit('old block not found')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
