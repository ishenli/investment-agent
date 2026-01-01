import { ModelThoughtChain } from '@typings/message/base';
import React from 'react';
export default function ThoughtChain({
  thoughtChain,
  id,
}: {
  thoughtChain?: ModelThoughtChain;
  id: string;
}) {
  if (!thoughtChain) return null;
  return <div>{thoughtChain?.title}</div>;
}
