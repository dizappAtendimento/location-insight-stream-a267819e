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
  // Render message with variables replaced
  const renderMessageText = (text: string) => {
    if (!text) return null;
    
    // Replace variables with example values
    let renderedText = text
      .replace(/\{\{nome\}\}/gi, contactName)
      .replace(/\{\{telefone\}\}/gi, '5511999999999')
      .replace(/\{\{saudacao\}\}/gi, 'Bom dia')
      .replace(/\{\{hora\}\}/gi, new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      .replace(/\{\{data\}\}/gi, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{\{dia_semana\}\}/gi, new Date().toLocaleDateString('pt-BR', { weekday: 'long' }));
    
    // Handle WhatsApp formatting
    // Bold: *text*
    renderedText = renderedText.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    // Italic: _text_
    renderedText = renderedText.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Strikethrough: ~text~
    renderedText = renderedText.replace(/~([^~]+)~/g, '<del>$1</del>');
    // Monospace: ```text```
    renderedText = renderedText.replace(/```([^`]+)```/g, '<code class="bg-black/10 px-1 rounded font-mono text-xs">$1</code>');
    
    return renderedText;
  };

  const currentTime = useMemo(() => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const hasContent = messages.some(m => m.text.trim() || m.mediaUrl);

  return (
    <div className="flex flex-col h-full">
      {/* Phone Frame */}
      <div className="relative w-full max-w-[300px] mx-auto">
        {/* Phone bezel */}
        <div className="rounded-[2.5rem] bg-gradient-to-b from-zinc-800 to-zinc-900 p-3 shadow-2xl border border-zinc-700/50">
          {/* Dynamic Island */}
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-zinc-800 mr-8" />
          </div>
          
          {/* Screen */}
          <div className="rounded-[2rem] overflow-hidden h-[500px] flex flex-col shadow-inner" style={{ background: 'linear-gradient(180deg, #0b141a 0%, #111b21 100%)' }}>
            {/* WhatsApp header */}
            <div className="bg-gradient-to-r from-[#1f2c34] to-[#202c33] px-3 py-3 flex items-center gap-3 border-b border-white/5">
              <div className="relative">
                <img 
                  src={dizappAvatar} 
                  alt="dizapp" 
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-[#00a884]/30"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#00a884] rounded-full border-2 border-[#202c33]" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold tracking-wide">dizapp</p>
                <p className="text-[#00a884] text-xs font-medium">online</p>
              </div>
              <div className="flex items-center gap-4">
                <svg className="w-5 h-5 text-[#aebac1]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"/>
                </svg>
                <svg className="w-5 h-5 text-[#aebac1]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/>
                </svg>
              </div>
            </div>

            {/* Chat background with pattern */}
            <div 
              className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M20 20h2v2h-2zM40 40h2v2h-2zM60 60h2v2h-2zM60 20h2v2h-2zM20 60h2v2h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: '#0b141a'
              }}
            >
              {!hasContent ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="bg-[#202c33]/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-white/5">
                    <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-[#00a884]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                      </svg>
                    </div>
                    <p className="text-[#8696a0] text-sm">
                      Digite uma mensagem para<br/>ver o preview
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    if (!message.text.trim() && !message.mediaUrl) return null;
                    
                    return (
                      <div key={message.id} className="flex justify-end animate-fade-in">
                        <div className="max-w-[85%] relative group">
                          {/* Message bubble */}
                          <div className="bg-gradient-to-br from-[#005c4b] to-[#004d40] rounded-2xl rounded-tr-sm px-3 py-2 shadow-lg">
                            {/* Media preview */}
                            {message.mediaUrl && (
                              <div className="mb-2 -mx-1 -mt-0.5">
                                {message.mediaType === 'image' ? (
                                  <img 
                                    src={message.mediaUrl} 
                                    alt="" 
                                    className="w-full rounded-xl object-cover max-h-[150px]"
                                  />
                                ) : message.mediaType === 'video' ? (
                                  <div className="w-full h-[100px] bg-black/40 rounded-xl flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                                    </div>
                                  </div>
                                ) : message.mediaType === 'audio' ? (
                                  <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shadow-md">
                                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full w-1/3 bg-[#00a884] rounded-full" />
                                      </div>
                                    </div>
                                    <span className="text-[11px] text-white/60">0:15</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md">
                                      PDF
                                    </div>
                                    <span className="text-xs text-white/90 truncate flex-1 font-medium">
                                      {message.mediaName || 'documento.pdf'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Text */}
                            {message.text && (
                              <p 
                                className="text-white text-[13px] leading-relaxed whitespace-pre-wrap break-words"
                                dangerouslySetInnerHTML={{ __html: renderMessageText(message.text) || '' }}
                              />
                            )}
                            
                            {/* Time and checkmarks */}
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              <span className="text-[10px] text-white/50">{currentTime}</span>
                              <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
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
            <div className="bg-gradient-to-r from-[#1f2c34] to-[#202c33] px-3 py-2.5 flex items-center gap-2 border-t border-white/5">
              <button className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-[#8696a0]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-3.505 0-5.388-1.164-5.607-1.959 0 0 5.912 1.055 10.658 0zM11.804 1.011C5.609 1.011.978 6.033.978 12.228s4.826 10.761 11.021 10.761S23.02 18.423 23.02 12.228c.001-6.195-5.021-11.217-11.216-11.217zM12 21.354c-5.273 0-9.381-3.886-9.381-9.159s3.942-9.548 9.215-9.548 9.548 4.275 9.548 9.548c-.001 5.272-4.109 9.159-9.382 9.159zm3.108-9.751c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962z"/>
                </svg>
              </button>
              <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2.5 flex items-center">
                <span className="text-[#8696a0] text-sm">Mensagem</span>
              </div>
              <button className="w-11 h-11 rounded-full bg-gradient-to-br from-[#00a884] to-[#008f72] flex items-center justify-center shadow-lg shadow-[#00a884]/20 hover:shadow-[#00a884]/30 transition-shadow">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
