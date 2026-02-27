import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import ReactFlow, { Node, Edge, MarkerType, Position } from 'reactflow';
import dagre from 'dagre';
import gsap from 'gsap';
import RabbitFlow from './RabbitFlow';
import MainNode from './nodes/MainNode';
import QuestionNode from './nodes/QuestionNode';
import CustomBranchInput from './CustomBranchInput';
import '../styles/search.css';
import { searchRabbitHole } from '../services/api';
import Sidebar from './Sidebar';
import { getHistorySessions, saveHistorySession, deleteHistorySession, renameHistorySession, HistorySession, RabbitHoleExport, ConversationMessage } from '../services/history';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 600;
const nodeHeight = 500;
const questionNodeWidth = 300;
const questionNodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 800,
    ranksep: 500,
    marginx: 100,
    align: 'DL',
    ranker: 'tight-tree'
  });

  const allNodes = dagreGraph.nodes();
  allNodes.forEach(node => dagreGraph.removeNode(node));

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.id === 'main' ? nodeWidth : questionNodeWidth,
      height: node.id === 'main' ? nodeHeight : questionNodeHeight
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.id === 'main' ? nodeWidth / 2 : questionNodeWidth / 2),
        y: nodeWithPosition.y - (node.id === 'main' ? nodeHeight / 2 : questionNodeHeight / 2)
      },
      targetPosition: Position.Left,
      sourcePosition: Position.Right
    };
  });

  return { nodes: newNodes, edges };
};

interface Source {
  title: string;
  url: string;
  uri: string;
  author: string;
  image: string;
}

interface ImageData {
  url: string;
  thumbnail: string;
  description: string;
}

interface SearchResponse {
  response: string;
  followUpQuestions: string[];
  sources: Source[];
  images: ImageData[];
  contextualQuery: string;
}

// ─── JSON Import/Export types are now in history.ts ────────────────────────

const useDeckHoverAnimation = (deckRef: React.RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (!deckRef.current) return;

    const deck = deckRef.current;
    const symbol = deck.querySelector('svg');
    const card = deck.querySelector('.card-content');
    let floatingAnimation: gsap.core.Timeline;

    gsap.set(symbol, { scale: 1 });
    gsap.set(card, {
      y: 0,
      rotate: 0,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    });

    const createFloatingAnimation = () => {
      const timeline = gsap.timeline({
        repeat: -1,
        yoyo: true,
        defaults: { duration: 2, ease: "power1.inOut" }
      });

      const randomRotation = (Math.random() - 0.5) * 10;

      timeline
        .to(card, {
          y: -15,
          x: 5,
          rotate: randomRotation,
          boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.3)',
          duration: 2
        })
        .to(card, {
          y: -10,
          x: -5,
          rotate: -randomRotation,
          boxShadow: '0 15px 25px -8px rgba(0, 0, 0, 0.25)',
          duration: 2
        })
        .to(card, {
          y: -20,
          x: 0,
          rotate: 0,
          boxShadow: '0 25px 35px -12px rgba(0, 0, 0, 0.35)',
          duration: 2
        });

      timeline
        .to(symbol, {
          scale: 1.1,
          rotate: 5,
          duration: 3,
          ease: "none"
        }, 0)
        .to(symbol, {
          scale: 1.15,
          rotate: -5,
          duration: 3,
          ease: "none"
        }, 3);

      return timeline;
    };

    const onHover = () => {
      if (floatingAnimation) {
        floatingAnimation.kill();
      }

      floatingAnimation = createFloatingAnimation();

      gsap.to(card, {
        boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.1)',
        duration: 0.5
      });

      deck.classList.add('particles-active');
    };

    const onHoverOut = () => {
      if (floatingAnimation) {
        floatingAnimation.kill();
      }

      gsap.to(symbol, {
        scale: 1,
        rotate: 0,
        duration: 0.5,
        ease: 'power2.out'
      });

      gsap.to(card, {
        y: 0,
        x: 0,
        rotate: 0,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        duration: 0.5,
        ease: 'power2.out',
        clearProps: 'all' // Clear all applied properties
      });

      deck.classList.remove('particles-active');
    };

    deck.addEventListener('mouseenter', onHover);
    deck.addEventListener('mouseleave', onHoverOut);

    return () => {
      if (floatingAnimation) {
        floatingAnimation.kill();
      }
      deck.removeEventListener('mouseenter', onHover);
      deck.removeEventListener('mouseleave', onHoverOut);
    };
  }, [deckRef]);
};

const DECK_QUESTIONS = {
  thoth: [
    "What secrets lie in the cosmic patterns of consciousness?",
    "How do ancient symbols guide modern wisdom seekers?",
    "What hidden knowledge flows through the akashic records?",
    "How do celestial alignments influence human consciousness?",
    "What mysteries of sacred geometry shape our reality?",
    "How does divine wisdom manifest in everyday synchronicities?"
  ],
  anubis: [
    "What lies beyond the veil between life and death?",
    "How do souls navigate the journey through the afterlife?",
    "What wisdom do ancestral spirits wish to share?",
    "How does death illuminate the meaning of life?",
    "What secrets lie in the ancient Egyptian Book of the Dead?",
    "How do we bridge the gap between mortal and immortal realms?"
  ],
  isis: [
    "How does ancient wisdom guide our modern understanding?",
    "What forgotten knowledge lies in the temples of antiquity?",
    "How do we unlock the mysteries of divine feminine power?",
    "What sacred rituals can transform consciousness?",
    "How do we balance material and spiritual existence?",
    "What ancient healing practices remain relevant today?"
  ]
} as const;

const getRandomQuestion = (category: keyof typeof DECK_QUESTIONS) => {
  const questions = DECK_QUESTIONS[category];
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
};

const SearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentConcept, setCurrentConcept] = useState<string>('');
  const [customBranchQuestions, setCustomBranchQuestions] = useState<string[]>([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [selectedSourceNodeId, setSelectedSourceNodeId] = useState<string>('');
  const [importToast, setImportToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sidebar and History
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setSessions(getHistorySessions());
  }, []);

  const onAskFollowUpRef = useRef<(nodeId: string) => void>(() => { });
  onAskFollowUpRef.current = (nodeId: string) => {
    setSelectedSourceNodeId(nodeId);
    setFollowUpInput('');
    setShowFollowUpModal(true);
  };

  const onDeleteNodeRef = useRef<(nodeId: string) => void>(() => { });
  onDeleteNodeRef.current = (nodeId: string) => {
    // Collect all descendants (including the node itself) to remove
    const getDescendants = (id: string, currentEdges: Edge[]): string[] => {
      const children = currentEdges.filter(e => e.source === id).map(e => e.target);
      return [id, ...children.flatMap(childId => getDescendants(childId, currentEdges))];
    };

    const nodesToRemove = getDescendants(nodeId, edgesRef.current);

    const updatedNodes = nodesRef.current.filter(n => !nodesToRemove.includes(n.id));
    const updatedEdges = edgesRef.current.filter(e =>
      !nodesToRemove.includes(e.source) && !nodesToRemove.includes(e.target)
    );

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(updatedNodes, updatedEdges);

    nodesRef.current = layoutedNodes;
    edgesRef.current = layoutedEdges;
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // After deleting nodes, if there are no main nodes left, reset to new session
    const hasMainNode = layoutedNodes.some(n => n.type === 'mainNode');
    if (!hasMainNode) {
      setSearchResult(null);
    }
  };

  // nodeTypes is memoized once; MainNode receives a stable wrapper that reads the latest ref
  const nodeTypes = useMemo(() => ({
    mainNode: (props: React.ComponentProps<typeof MainNode>) => (
      <MainNode
        {...props}
        data={{
          ...props.data,
          onAskFollowUp: () => onAskFollowUpRef.current(props.id),
          onDeleteNode: () => onDeleteNodeRef.current(props.id)
        }}
      />
    ),
    questionNode: (props: React.ComponentProps<typeof QuestionNode>) => (
      <QuestionNode
        {...props}
        data={{
          ...props.data,
          onDeleteNode: () => onDeleteNodeRef.current(props.id)
        }}
      />
    )
  }), []);
  const activeRequestRef = useRef<{ [key: string]: AbortController | null }>({});
  // Refs to always hold the latest state values, avoiding stale closures
  const edgesRef = useRef<Edge[]>([]);
  const nodesRef = useRef<Node[]>([]);

  const thothDeckRef = useRef<HTMLDivElement>(null);
  const anubisDeckRef = useRef<HTMLDivElement>(null);
  const isisDeckRef = useRef<HTMLDivElement>(null);

  const [deckQuestions, setDeckQuestions] = useState({
    thoth: getRandomQuestion('thoth'),
    anubis: getRandomQuestion('anubis'),
    isis: getRandomQuestion('isis')
  });

  const refreshDeckQuestion = (category: keyof typeof DECK_QUESTIONS) => {
    setDeckQuestions(prev => ({
      ...prev,
      [category]: getRandomQuestion(category)
    }));
  };

  const addCustomBranchQuestion = (question: string) => {
    setCustomBranchQuestions(prev => [...prev, question]);
  };

  const removeCustomBranchQuestion = (index: number) => {
    setCustomBranchQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomFollowUp = () => {
    const question = followUpInput.trim();
    if (!question) return;

    // Find the last expanded main node to connect to
    const sourceId = selectedSourceNodeId || (
      nodesRef.current.filter(n => n.type === 'mainNode' && n.data.isExpanded).at(-1)?.id
      ?? nodesRef.current[0]?.id
      ?? 'main'
    );

    const uniqueId = `question-custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNode: Node = {
      id: uniqueId,
      type: 'questionNode',
      data: {
        label: question,
        isExpanded: false,
        content: '',
        images: [],
        sources: [],
        isCustom: true
      },
      position: { x: 0, y: 0 }
    };
    const newEdge: Edge = {
      id: `edge-${uniqueId}`,
      source: sourceId,
      target: uniqueId,
      style: { stroke: 'rgba(248, 248, 248, 0.8)', strokeWidth: 1.5 },
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(248, 248, 248, 0.8)' }
    };

    const mergedEdges = [...edgesRef.current, newEdge];
    const { nodes: layoutedNodes } = getLayoutedElements(
      [...nodesRef.current, newNode],
      mergedEdges
    );
    edgesRef.current = mergedEdges;
    nodesRef.current = layoutedNodes;
    setEdges(mergedEdges);
    setNodes(layoutedNodes);

    setFollowUpInput('');
    setShowFollowUpModal(false);
  };

  const saveCurrentSession = useCallback(() => {
    if (!query && nodesRef.current.length === 0) return; // don't save empty

    const sessionId = currentSessionId || crypto.randomUUID();
    const newSession: HistorySession = {
      id: sessionId,
      timestamp: Date.now(),
      version: '1.0',
      query,
      currentConcept,
      conversationHistory,
      nodes: nodesRef.current,
      edges: edgesRef.current,
      branchQuestions: customBranchQuestions
    };
    saveHistorySession(newSession);
    setSessions(getHistorySessions());
    if (!currentSessionId) setCurrentSessionId(sessionId);
  }, [query, currentConcept, conversationHistory, customBranchQuestions, currentSessionId]);

  useEffect(() => {
    if (nodes.length > 0) {
      const timeoutId = setTimeout(() => {
        saveCurrentSession();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, customBranchQuestions, query, currentConcept, conversationHistory, saveCurrentSession]);

  const handleSelectSession = useCallback((session: HistorySession) => {
    setCurrentSessionId(session.id);
    setQuery(session.query || '');
    setCurrentConcept(session.currentConcept || '');
    setConversationHistory(session.conversationHistory || []);
    setCustomBranchQuestions(session.branchQuestions || []);

    const loadedNodes = session.nodes || [];
    const loadedEdges = session.edges || [];
    nodesRef.current = loadedNodes;
    edgesRef.current = loadedEdges;
    setNodes(loadedNodes);
    setEdges(loadedEdges);

    if (loadedNodes.length > 0) {
      setSearchResult({
        response: '',
        followUpQuestions: [],
        sources: [],
        images: [],
        contextualQuery: session.query || '',
      } as SearchResponse);
    } else {
      setSearchResult(null);
    }

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setQuery('');
    setCurrentConcept('');
    setConversationHistory([]);
    setCustomBranchQuestions([]);
    nodesRef.current = [];
    edgesRef.current = [];
    setNodes([]);
    setEdges([]);
    setSearchResult(null);

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleDeleteSession = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteHistorySession(id);
    setSessions(getHistorySessions());
    if (currentSessionId === id) {
      handleNewSession();
    }
  }, [currentSessionId, handleNewSession]);

  const handleRenameSession = useCallback((id: string, newName: string) => {
    renameHistorySession(id, newName);
    setSessions(getHistorySessions());
    if (currentSessionId === id) {
      setQuery(newName);
    }
  }, [currentSessionId]);

  // useDeckHoverAnimation(thothDeckRef);
  // useDeckHoverAnimation(anubisDeckRef);
  // useDeckHoverAnimation(isisDeckRef);

  // ─── JSON Export ────────────────────────────────────────────────────────────
  const handleExportJSON = useCallback(() => {
    const payload: RabbitHoleExport = {
      version: '1.0',
      query,
      currentConcept,
      conversationHistory,
      nodes: nodesRef.current,
      edges: edgesRef.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (query || 'rabbitholes').replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '_').slice(0, 40);
    a.download = `rabbitholes_${safeName}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [query, currentConcept, conversationHistory]);

  // ─── JSON Import ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setImportToast(msg);
    setTimeout(() => setImportToast(null), 3000);
  }, []);

  const handleImportJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data: RabbitHoleExport = JSON.parse(evt.target?.result as string);

        if (data.type === 'branch-only' && Array.isArray(data.branchQuestions)) {
          setCustomBranchQuestions(data.branchQuestions);
          showToast(`✓ 已导入 ${data.branchQuestions.length} 个分支问题`);
          return;
        }

        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          showToast('✗ 无效的 JSON 格式：缺少 nodes 或 edges');
          return;
        }

        if (data.query) setQuery(data.query);
        if (data.currentConcept) setCurrentConcept(data.currentConcept);
        if (data.conversationHistory) setConversationHistory(data.conversationHistory);

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(data.nodes, data.edges);
        nodesRef.current = layoutedNodes;
        edgesRef.current = layoutedEdges;
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        setSearchResult({
          response: '',
          followUpQuestions: [],
          sources: [],
          images: [],
          contextualQuery: data.query || '',
        } as SearchResponse);

        showToast(`✓ 导入成功：${layoutedNodes.length} 个节点`);
      } catch {
        showToast('✗ JSON 解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  useEffect(() => {
    return () => {
      Object.values(activeRequestRef.current).forEach(controller => {
        if (controller) {
          controller.abort();
        }
      });
    };
  }, []);

  const handleNodeClick = async (node: Node) => {
    if (!node.id.startsWith('question-') || node.data.isExpanded) return;

    // Check if there are any active requests
    const hasActiveRequests = Object.values(activeRequestRef.current).some(controller => controller !== null);
    if (hasActiveRequests) return;

    if (activeRequestRef.current[node.id]) {
      activeRequestRef.current[node.id]?.abort();
    }

    const abortController = new AbortController();
    activeRequestRef.current[node.id] = abortController;

    const questionText = node.data.label;
    setIsLoading(true);

    try {
      // Use nodesRef to avoid stale closure when reading current nodes
      const lastMainNode = nodesRef.current.find(n => n.type === 'mainNode' && n.data.isExpanded);
      if (lastMainNode) {
        const newHistoryEntry: ConversationMessage = {
          user: lastMainNode.data.label,
          assistant: lastMainNode.data.content
        };
        setConversationHistory(prev => [...prev, newHistoryEntry]);
      }

      setNodes(prevNodes => {
        const updated = prevNodes.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              type: 'mainNode',
              style: {
                ...n.style,
                width: nodeWidth,
                height: nodeHeight
              },
              data: {
                ...n.data,
                content: 'Loading...',
                isExpanded: true
              }
            };
          }
          return n;
        });
        nodesRef.current = updated;
        return updated;
      });

      const response = await searchRabbitHole({
        query: questionText,
        previousConversation: conversationHistory,
        concept: currentConcept,
        followUpMode: 'expansive'
      }, abortController.signal);

      if (activeRequestRef.current[node.id] === abortController) {
        setNodes(prevNodes => {
          const transformedNodes = prevNodes.map(n => {
            if (n.id === node.id) {
              return {
                ...n,
                type: 'mainNode',
                style: {
                  ...n.style,
                  width: nodeWidth,
                  minHeight: '500px',
                  background: '#1a1a1a',
                  opacity: 1,
                  cursor: 'default'
                },
                data: {
                  label: response.contextualQuery || questionText,
                  content: response.response,
                  images: response.images?.map((img: ImageData) => img.url),
                  sources: response.sources,
                  isExpanded: true
                }
              };
            }
            return n;
          });

          const newFollowUpNodes: Node[] = response.followUpQuestions.map((question: string, index: number) => {
            const uniqueId = `question-${node.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
            return {
              id: uniqueId,
              type: 'default',
              data: {
                label: question,
                isExpanded: false,
                content: '',
                images: [],
                sources: []
              },
              position: { x: 0, y: 0 },
              style: {
                width: questionNodeWidth,
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'left',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer'
              }
            };
          });

          // Use edgesRef to read the latest edges, avoiding stale closure
          const currentEdges = edgesRef.current;
          const newEdges: Edge[] = newFollowUpNodes.map((followUpNode) => ({
            id: `edge-${followUpNode.id}`,
            source: node.id,
            target: followUpNode.id,
            style: {
              stroke: 'rgba(248, 248, 248, 0.8)',
              strokeWidth: 1.5
            },
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'rgba(248, 248, 248, 0.8)'
            }
          }));

          const mergedEdges = [...currentEdges, ...newEdges];
          const { nodes: finalLayoutedNodes } = getLayoutedElements(
            [...transformedNodes, ...newFollowUpNodes],
            mergedEdges
          );

          // Update edgesRef and state together
          edgesRef.current = mergedEdges;
          setEdges(mergedEdges);

          nodesRef.current = finalLayoutedNodes;
          return finalLayoutedNodes;
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError' && activeRequestRef.current[node.id] === abortController) {
        console.error('Failed to process node click:', error);

        setNodes(prevNodes => {
          const updated = prevNodes.map(n => {
            if (n.id === node.id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  isExpanded: false
                },
                style: {
                  ...node.style,
                  opacity: 1
                }
              };
            }
            return n;
          });
          nodesRef.current = updated;
          return updated;
        });
      }
    } finally {
      if (activeRequestRef.current[node.id] === abortController) {
        activeRequestRef.current[node.id] = null;
        setIsLoading(false);
      }
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setIsLoading(true);
      const loadingNode: Node = {
        id: 'main',
        type: 'mainNode',
        data: {
          label: query,
          content: 'Loading...',
          images: [],
          sources: [],
          isExpanded: true
        },
        position: { x: 0, y: 0 },
        style: {
          width: nodeWidth,
          height: nodeHeight,
          minHeight: nodeHeight,
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          cursor: 'default'
        }
      };

      setNodes([loadingNode]);
      setEdges([]);

      const response = await searchRabbitHole({
        query,
        previousConversation: conversationHistory,
        concept: currentConcept,
        followUpMode: 'expansive'
      });
      setSearchResult(response);

      const mainNode: Node = {
        ...loadingNode,
        data: {
          label: response.contextualQuery || query,
          content: response.response,
          images: response.images?.map((img: ImageData) => img.url),
          sources: response.sources,
          isExpanded: true
        }
      };
      // Merge AI-generated follow-up questions with user's custom branch questions
      const allFollowUpQuestions = [
        ...response.followUpQuestions,
        ...customBranchQuestions.filter(q => !response.followUpQuestions.includes(q))
      ];
      const followUpNodes: Node[] = allFollowUpQuestions.map((question: string, index: number) => {
        const isCustom = index >= response.followUpQuestions.length;
        return {
          id: `question-${index}`,
          type: 'questionNode',
          data: {
            label: question,
            isExpanded: false,
            content: '',
            images: [],
            sources: [],
            isCustom
          },
          position: { x: 0, y: 0 }
        };
      });

      const edges: Edge[] = followUpNodes.map((_, index) => ({
        id: `edge-${index}`,
        source: 'main',
        target: `question-${index}`,
        style: {
          stroke: 'rgba(248, 248, 248, 0.8)',
          strokeWidth: 1.5
        },
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'rgba(248, 248, 248, 0.8)'
        }
      }));


      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        [mainNode, ...followUpNodes],
        edges
      );

      // Keep refs in sync with initial search result
      nodesRef.current = layoutedNodes;
      edgesRef.current = layoutedEdges;
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };



  // ─── Toast notification ───────────────────────────────────────────────────
  const toastEl = importToast ? (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full bg-[#1a1a1a] border border-white/15 text-white/80 text-sm font-light shadow-2xl transition-all duration-300">
      {importToast}
    </div>
  ) : null;

  const renderMainContent = () => {
    if (!searchResult) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full overflow-y-auto relative bg-[#0A0A0A]">
          <a
            href="https://github.com/AsyncFuncAI/rabbitholes"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed top-6 right-6 z-50 transform hover:scale-110 transition-transform duration-300 group"
          >
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#2c2c2c] via-[#3c3c3c] to-[#2c2c2c] rounded-full opacity-0 group-hover:opacity-30 transition duration-500 blur-sm animate-gradient-xy"></div>
              <svg
                className="w-8 h-8 text-white/70 hover:text-white/90 transition-colors duration-300"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
          </a>
          <div className="w-full max-w-2xl mx-auto text-center relative">
            <div className="mb-12 animate-float">
              <svg className="w-16 h-16 mx-auto animate-pulse-glow" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </div>

            <div className="relative w-full max-w-xl mx-auto group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2c2c2c] via-[#3c3c3c] to-[#2c2c2c] rounded-full opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-gradient-xy blur-sm"></div>
              <input
                type="text"
                className="w-full px-6 py-4 rounded-full bg-[#111111] text-white/90 border border-white/10 focus:border-white/20 focus:outline-none placeholder-white/30 shadow-lg backdrop-blur-sm font-light tracking-wide"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                placeholder="Ask your question..."
                disabled={isLoading}
              />
              {isLoading ? (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border border-white/20 rounded-full animate-spin border-t-white/80"></div>
                </div>
              ) : (
                <button
                  onClick={handleSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-white/5 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
            </div>

            <CustomBranchInput
              questions={customBranchQuestions}
              onAdd={addCustomBranchQuestion}
              onRemove={removeCustomBranchQuestion}
            />


          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-background overflow-hidden">
        <RabbitFlow
          initialNodes={nodes}
          initialEdges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
        />

        {/* Modal overlay */}
        {showFollowUpModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowFollowUpModal(false); }}
          >
            <div className="w-full max-w-md mx-4 bg-[#111111] border border-white/15 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-white/80 text-sm font-light tracking-[0.15em] uppercase mb-4">
                Ask a Follow Up
              </h3>

              {/* Branch-from node picker */}
              {(() => {
                const mainNodes = nodesRef.current.filter(n => n.type === 'mainNode' && n.data.isExpanded);
                if (mainNodes.length <= 1) return null;
                return (
                  <div className="mb-4">
                    <p className="text-white/40 text-xs tracking-wider uppercase mb-2">Branch from</p>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                      {mainNodes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => setSelectedSourceNodeId(n.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-light transition-all duration-150 border truncate max-w-[180px] ${selectedSourceNodeId === n.id
                            ? 'bg-white/15 border-white/40 text-white'
                            : 'bg-transparent border-white/15 text-white/50 hover:border-white/30 hover:text-white/70'
                            }`}
                          title={n.data.label}
                        >
                          {n.data.label.length > 28 ? n.data.label.slice(0, 28) + '…' : n.data.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2c2c2c] via-[#3c3c3c] to-[#2c2c2c] rounded-xl opacity-30 group-focus-within:opacity-60 transition duration-500 blur-sm" />
                <textarea
                  autoFocus
                  className="relative w-full px-4 py-3 rounded-xl bg-[#0d0d0d] text-white/90 border border-white/10 focus:border-white/25 focus:outline-none placeholder-white/25 text-sm font-light resize-none leading-relaxed"
                  rows={3}
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddCustomFollowUp();
                    }
                    if (e.key === 'Escape') setShowFollowUpModal(false);
                  }}
                  placeholder="What else would you like to explore?"
                />
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowFollowUpModal(false)}
                  className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomFollowUp}
                  disabled={!followUpInput.trim()}
                  className="px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Add Branch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-white">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onImportClick={() => fileInputRef.current?.click()}
        onExportClick={handleExportJSON}
        showExport={!!searchResult}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className={`flex-1 relative h-full flex flex-col overflow-hidden bg-[#0A0A0A] transition-all duration-300`}>
        {/* Toggle switch for desktop/mobile when sidebar is closed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-40 p-2 rounded-lg bg-transparent hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Open Sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportJSON}
        />
        {toastEl}

        {renderMainContent()}
      </div>
    </div>
  );
};

export default SearchView; 