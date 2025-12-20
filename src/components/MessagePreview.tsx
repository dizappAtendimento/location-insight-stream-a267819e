import { useMemo } from 'react';
import { CheckCheck } from 'lucide-react';
import dizappAvatar from '@/assets/dizapp-avatar.png';

interface MessageItem {
  id: number;
  text: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | null;
  mediaUrl: string | null;
  mediaName: string | null;
}

interface MessagePreviewProps {
  messages: MessageItem[];
  contactName?: string;
}

export function MessagePreview({ messages, contactName = 'Contato Exemplo' }: MessagePreviewProps) {
  const renderMessageText = (text: string) => {
    if (!text) return null;
    
    let renderedText = text
      .replace(/\{\{nome\}\}/gi, contactName)
      .replace(/\{\{telefone\}\}/gi, '5511999999999')
      .replace(/\{\{saudacao\}\}/gi, 'Bom dia')
      .replace(/\{\{hora\}\}/gi, new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      .replace(/\{\{data\}\}/gi, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{\{dia_semana\}\}/gi, new Date().toLocaleDateString('pt-BR', { weekday: 'long' }));
    
    renderedText = renderedText.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    renderedText = renderedText.replace(/_([^_]+)_/g, '<em>$1</em>');
    renderedText = renderedText.replace(/~([^~]+)~/g, '<del>$1</del>');
    renderedText = renderedText.replace(/```([^`]+)```/g, '<code class="bg-black/10 px-1 rounded font-mono text-xs">$1</code>');
    
    return renderedText;
  };

  const currentTime = useMemo(() => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const hasContent = messages.some(m => m.text.trim() || m.mediaUrl);

  return (
    <div className="flex flex-col h-full">
      {/* iPhone Frame */}
      <div className="relative w-[280px] mx-auto">
        {/* Phone outer frame with pronounced shadow */}
        <div className="relative rounded-[40px] bg-black p-[4px] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7),0_10px_40px_-8px_rgba(0,0,0,0.5),0_0_20px_rgba(0,0,0,0.4)]">
          {/* Side buttons */}
          <div className="absolute -left-[3px] top-[80px] w-[3px] h-[30px] bg-zinc-700 rounded-l-sm" />
          <div className="absolute -left-[3px] top-[120px] w-[3px] h-[50px] bg-zinc-700 rounded-l-sm" />
          <div className="absolute -left-[3px] top-[180px] w-[3px] h-[50px] bg-zinc-700 rounded-l-sm" />
          <div className="absolute -right-[3px] top-[130px] w-[3px] h-[70px] bg-zinc-700 rounded-r-sm" />
          
          {/* Screen container */}
          <div className="rounded-[36px] overflow-hidden bg-[#0b141a]">
            {/* Status bar with notch */}
            <div className="relative h-[32px] bg-[#0b141a] flex items-center justify-center">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-black rounded-full" />
              {/* Status icons */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <div className="w-[18px] h-[9px] border border-white/40 rounded-[2px] flex items-center justify-end pr-[2px]">
                  <div className="w-[10px] h-[5px] bg-white/40 rounded-[1px]" />
                </div>
              </div>
            </div>

            {/* WhatsApp header */}
            <div className="bg-[#202c33] px-2 py-1.5 flex items-center gap-2">
              <div className="relative">
                <img 
                  src={dizappAvatar} 
                  alt="dizapp" 
                  className="w-[28px] h-[28px] rounded-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[11px] font-medium truncate">dizapp</p>
                <p className="text-[#25D366] text-[9px]">online</p>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"/>
                </svg>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/>
                </svg>
              </div>
            </div>

            {/* Chat area */}
            <div 
              className="h-[380px] p-3 overflow-y-auto"
              style={{ backgroundColor: '#0b141a' }}
            >
              {!hasContent ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-[#202c33] rounded-lg px-5 py-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-[#00a884]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                      </svg>
                    </div>
                    <p className="text-zinc-500 text-sm leading-tight">
                      Digite uma mensagem<br/>para ver o preview
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => {
                    if (!message.text.trim() && !message.mediaUrl) return null;
                    
                    return (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[90%]">
                          <div className="bg-[#005c4b] rounded-lg rounded-tr-[3px] px-3 py-2">
                            {message.mediaUrl && (
                              <div className="mb-1">
                                {message.mediaType === 'image' ? (
                                  <img 
                                    src={message.mediaUrl} 
                                    alt="" 
                                    className="w-full rounded object-cover max-h-[120px]"
                                  />
                                ) : message.mediaType === 'video' ? (
                                  <div className="w-full h-[80px] bg-black/40 rounded flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                                    </div>
                                  </div>
                                ) : message.mediaType === 'audio' ? (
                                  <div className="flex items-center gap-2 py-1">
                                    <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center">
                                      <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white border-b-[4px] border-b-transparent ml-[2px]" />
                                    </div>
                                    <div className="flex-1 h-[6px] bg-white/20 rounded-full">
                                      <div className="h-full w-1/3 bg-[#00a884] rounded-full" />
                                    </div>
                                    <span className="text-xs text-white/50">0:15</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 py-1">
                                    <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                                      PDF
                                    </div>
                                    <span className="text-xs text-white/80 truncate flex-1">
                                      {message.mediaName || 'doc.pdf'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {message.text && (
                              <p 
                                className="text-white text-[11px] leading-relaxed whitespace-pre-wrap break-words"
                                dangerouslySetInnerHTML={{ __html: renderMessageText(message.text) || '' }}
                              />
                            )}
                            
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[9px] text-white/40">{currentTime}</span>
                              <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="bg-[#202c33] px-2 py-1.5 flex items-center gap-1.5">
              <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-zinc-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-3.505 0-5.388-1.164-5.607-1.959 0 0 5.912 1.055 10.658 0zM11.804 1.011C5.609 1.011.978 6.033.978 12.228s4.826 10.761 11.021 10.761S23.02 18.423 23.02 12.228c.001-6.195-5.021-11.217-11.216-11.217zM12 21.354c-5.273 0-9.381-3.886-9.381-9.159s3.942-9.548 9.215-9.548 9.548 4.275 9.548 9.548c-.001 5.272-4.109 9.159-9.382 9.159zm3.108-9.751c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962z"/>
                </svg>
              </div>
              <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5">
                <span className="text-zinc-500 text-[11px]">Mensagem</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
